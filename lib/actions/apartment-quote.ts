"use server";

import { randomUUID } from "crypto";
import { z } from "zod";
import { requireProfile } from "@/lib/auth";
import {
  CALCULATION_COLUMNS,
  FLOOR_PLAN_BUCKET,
  FLOOR_PLAN_MAX_EDGE,
  FLOOR_PLAN_SOURCE_MAX_BYTES,
  FLOOR_PLAN_STORED_MAX_BYTES,
  QUOTE_MAX,
  calculateApartmentQuote,
  calculationToQuote,
  floorPlanStoragePath,
  isFloorPlanUrl,
  mapCalculationRow,
  parseDecimal,
  parseDiscountInputs,
  parseShareQuotes,
  quoteKey,
  quotesToJson,
} from "@/lib/apartment-quote";
import {
  convertImageToWebp,
  WEBP_CONTENT_TYPE,
} from "@/lib/image-processing";
import { isShareId } from "@/lib/catalog-share";
import type { ApartmentCalculation, ApartmentQuote } from "@/lib/types";

const uuidSchema = z.string().uuid();

const PLAN_MIME_BY_EXT: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
};

const PLAN_MIME_ALIASES: Record<string, string> = {
  "image/jpg": "image/jpeg",
  "image/pjpeg": "image/jpeg",
  "image/x-png": "image/png",
};

export type ApartmentCalculationResult =
  | { ok: true; calculation: ApartmentCalculation }
  | { ok: false; error: string };

function migrationError(error: { code?: string; message?: string } | null) {
  if (!error) return false;
  const message = error.message ?? "";
  return (
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    /apartment_calculations/i.test(message)
  );
}

function friendlySaveError(error: { code?: string; message?: string } | null) {
  if (migrationError(error)) {
    return "Расчёты ещё не подключены. Примените миграцию apartment_calculations.";
  }
  return "Не удалось сохранить расчёт.";
}

function resolvePlanMime(file: File) {
  const type = file.type.trim().toLowerCase();
  const normalized = PLAN_MIME_ALIASES[type] ?? type;
  if (normalized && Object.values(PLAN_MIME_BY_EXT).includes(normalized)) {
    return normalized;
  }
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  return PLAN_MIME_BY_EXT[ext] ?? "";
}

function isPlanFile(value: FormDataEntryValue | null): value is File {
  return typeof File !== "undefined" && value instanceof File && value.size > 0;
}

function readFormNumber(value: FormDataEntryValue | null) {
  return parseDecimal(typeof value === "string" ? value : null);
}

async function removeUnusedPlan(
  supabase: Awaited<ReturnType<typeof requireProfile>>["supabase"],
  userId: string,
  url: string | null,
) {
  const path = floorPlanStoragePath(url, userId);
  if (!path || !url) return;
  const { data: shares } = await supabase
    .from("catalog_shares")
    .select("quotes")
    .eq("created_by", userId)
    .is("revoked_at", null)
    .gt("expires_at", new Date().toISOString());
  const used = (shares ?? []).some((share) =>
    parseShareQuotes(share.quotes).some((quote) => quote.floor_plan_url === url),
  );
  if (!used) await supabase.storage.from(FLOOR_PLAN_BUCKET).remove([path]);
}

export async function saveApartmentCalculationAction(
  formData: FormData,
): Promise<ApartmentCalculationResult> {
  const { supabase, profile } = await requireProfile();
  const rawId = formData.get("id");
  const id =
    typeof rawId === "string" && rawId && uuidSchema.safeParse(rawId).success
      ? rawId
      : null;
  if (typeof rawId === "string" && rawId && !id) {
    return { ok: false, error: "Расчёт не найден." };
  }

  const propertyRaw = formData.get("property_id");
  const propertyId =
    typeof propertyRaw === "string" && propertyRaw
      ? propertyRaw
      : null;
  if (propertyId && !uuidSchema.safeParse(propertyId).success) {
    return { ok: false, error: "Комплекс не найден." };
  }

  const propertyTitle = String(formData.get("property_title") ?? "")
    .trim()
    .slice(0, 160);
  const termLabel = String(formData.get("term_label") ?? "")
    .trim()
    .slice(0, 80);
  let discountInputs: ReturnType<typeof parseDiscountInputs> = [];
  const discountsRaw = formData.get("discounts");
  if (typeof discountsRaw === "string" && discountsRaw.trim()) {
    try {
      discountInputs = parseDiscountInputs(JSON.parse(discountsRaw));
    } catch {
      return { ok: false, error: "Не удалось прочитать скидки." };
    }
  }
  const promoRaw = formData.get("developer_promo");
  const math = calculateApartmentQuote({
    area: readFormNumber(formData.get("area")),
    priceM2: readFormNumber(formData.get("price_m2")),
    price: readFormNumber(formData.get("price")),
    markupPct: readFormNumber(formData.get("markup_pct")) ?? 0,
    months: readFormNumber(formData.get("months")) ?? 0,
    downM2: readFormNumber(formData.get("down_m2")) ?? 0,
    downLump: readFormNumber(formData.get("down_lump")) ?? 0,
    discounts: discountInputs,
    developerPromo: typeof promoRaw === "string" ? promoRaw : null,
  });
  if (!math) return { ok: false, error: "Укажите стоимость квартиры." };

  const file = formData.get("floor_plan");
  const removePlan = formData.get("remove_floor_plan") === "1";
  if (isPlanFile(file)) {
    if (!resolvePlanMime(file)) {
      return {
        ok: false,
        error: "Можно загрузить JPG, PNG, WebP или GIF. HEIC сохраните как JPG.",
      };
    }
    if (file.size > FLOOR_PLAN_SOURCE_MAX_BYTES) {
      return { ok: false, error: "Скриншот должен быть меньше 3,5 МБ." };
    }
  }

  let existing: ApartmentCalculation | null = null;
  if (id) {
    const { data, error } = await supabase
      .from("apartment_calculations")
      .select(CALCULATION_COLUMNS)
      .eq("id", id)
      .eq("created_by", profile.id)
      .maybeSingle();
    if (error) return { ok: false, error: friendlySaveError(error) };
    existing = mapCalculationRow(data);
    if (!existing) return { ok: false, error: "Расчёт не найден." };
  }

  const payload = {
    created_by: profile.id,
    property_id: propertyId,
    property_title: propertyTitle || null,
    area: math.area,
    price_m2: math.priceM2,
    price: math.price,
    price_after_discount: math.priceAfterDiscount,
    discounts: math.discounts,
    developer_promo: math.developerPromo,
    markup_pct: math.markupPct,
    markup: math.markup,
    months: math.months,
    term_label: termLabel || math.termLabel,
    down_m2: math.downM2,
    down_lump: math.downLump,
    down_payment: math.downPayment,
    remaining: math.remaining,
    total: math.total,
    monthly: math.monthly,
  };

  const query = id
    ? supabase
        .from("apartment_calculations")
        .update(payload)
        .eq("id", id)
        .eq("created_by", profile.id)
    : supabase.from("apartment_calculations").insert(payload);

  const { data, error } = await query
    .select(CALCULATION_COLUMNS)
    .single();
  if (error || !data) return { ok: false, error: friendlySaveError(error) };
  let calculation = mapCalculationRow(data);
  if (!calculation) return { ok: false, error: "Не удалось сохранить расчёт." };

  if (isPlanFile(file)) {
    const uploaded = await uploadPlan(supabase, profile.id, calculation.id, file);
    if (!uploaded.ok) {
      if (!existing) {
        await supabase.from("apartment_calculations").delete().eq("id", calculation.id);
      }
      return uploaded;
    }
    const previous = existing?.floor_plan_url ?? null;
    const { data: withPlan, error: planError } = await supabase
      .from("apartment_calculations")
      .update({ floor_plan_url: uploaded.url })
      .eq("id", calculation.id)
      .select(CALCULATION_COLUMNS)
      .single();
    if (planError || !withPlan) {
      await supabase.storage.from(FLOOR_PLAN_BUCKET).remove([uploaded.path]);
      return { ok: false, error: "Не удалось сохранить планировку." };
    }
    calculation = mapCalculationRow(withPlan) ?? calculation;
    if (previous && previous !== uploaded.url) {
      await removeUnusedPlan(supabase, profile.id, previous);
    }
  } else if (removePlan && calculation.floor_plan_url) {
    const previous = calculation.floor_plan_url;
    const { data: cleared, error: clearError } = await supabase
      .from("apartment_calculations")
      .update({ floor_plan_url: null })
      .eq("id", calculation.id)
      .select(CALCULATION_COLUMNS)
      .single();
    if (clearError || !cleared) {
      return { ok: false, error: "Не удалось убрать планировку." };
    }
    calculation = mapCalculationRow(cleared) ?? calculation;
    await removeUnusedPlan(supabase, profile.id, previous);
  }

  return { ok: true, calculation };
}

async function uploadPlan(
  supabase: Awaited<ReturnType<typeof requireProfile>>["supabase"],
  userId: string,
  calculationId: string,
  file: File,
): Promise<
  { ok: true; url: string; path: string } | { ok: false; error: string }
> {
  let buffer: Buffer;
  try {
    buffer = (
      await convertImageToWebp(Buffer.from(await file.arrayBuffer()), {
        maxBytes: FLOOR_PLAN_STORED_MAX_BYTES,
        maxEdge: FLOOR_PLAN_MAX_EDGE,
        failOn: "none",
      })
    ).buffer;
  } catch {
    return { ok: false, error: "Не удалось обработать планировку." };
  }

  const path = `${userId}/${calculationId}-${randomUUID()}.webp`;
  const { error } = await supabase.storage.from(FLOOR_PLAN_BUCKET).upload(path, buffer, {
    contentType: WEBP_CONTENT_TYPE,
    upsert: false,
    cacheControl: "31536000",
  });
  if (error) {
    const missingBucket = /bucket|floor-plans/i.test(error.message);
    return {
      ok: false,
      error: missingBucket
        ? "Хранилище планировок ещё не создано. Примените миграцию apartment_calculations."
        : "Не удалось загрузить планировку.",
    };
  }
  const { data } = supabase.storage.from(FLOOR_PLAN_BUCKET).getPublicUrl(path);
  if (!isFloorPlanUrl(data.publicUrl)) {
    await supabase.storage.from(FLOOR_PLAN_BUCKET).remove([path]);
    return { ok: false, error: "Не удалось загрузить планировку." };
  }
  return { ok: true, url: data.publicUrl, path };
}

export async function deleteApartmentCalculationAction(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { supabase, profile } = await requireProfile();
  if (!uuidSchema.safeParse(id).success) {
    return { ok: false, error: "Расчёт не найден." };
  }
  const { data, error } = await supabase
    .from("apartment_calculations")
    .delete()
    .eq("id", id)
    .eq("created_by", profile.id)
    .select("floor_plan_url")
    .maybeSingle();
  if (error) return { ok: false, error: friendlySaveError(error) };
  if (!data) return { ok: false, error: "Расчёт не найден." };
  const url = typeof data.floor_plan_url === "string" ? data.floor_plan_url : null;
  await removeUnusedPlan(supabase, profile.id, url);
  return { ok: true };
}

export async function loadQuoteSnapshots(
  calculationIds: string[],
): Promise<
  | { ok: true; quotes: ApartmentQuote[]; propertyIds: string[] }
  | { ok: false; error: string }
> {
  const { supabase, profile } = await requireProfile();
  const ids = calculationIds.filter((id, index) => {
    return uuidSchema.safeParse(id).success && calculationIds.indexOf(id) === index;
  }).slice(0, QUOTE_MAX);
  if (!ids.length) return { ok: true, quotes: [], propertyIds: [] };

  const { data, error } = await supabase
    .from("apartment_calculations")
    .select(CALCULATION_COLUMNS)
    .in("id", ids)
    .eq("created_by", profile.id);
  if (error) return { ok: false, error: friendlySaveError(error) };

  const byId = new Map<string, ApartmentCalculation>();
  for (const row of data ?? []) {
    const calculation = mapCalculationRow(row);
    if (calculation) byId.set(calculation.id, calculation);
  }
  const quotes = ids.flatMap((id) => {
    const calculation = byId.get(id);
    return calculation ? [calculationToQuote(calculation, randomUUID())] : [];
  });
  if (!quotes.length) {
    return { ok: false, error: "Эти расчёты больше недоступны." };
  }
  return {
    ok: true,
    quotes,
    propertyIds: quotes.flatMap((quote) =>
      quote.property_id ? [quote.property_id] : [],
    ),
  };
}

export async function updateShareQuotesAction(input: {
  shareId: string;
  addCalculationIds?: string[];
  removeKeys?: string[];
}): Promise<{ ok: true; quotes: ApartmentQuote[] } | { ok: false; error: string }> {
  const { supabase, profile } = await requireProfile();
  if (!isShareId(input.shareId)) return { ok: false, error: "Подборка не найдена." };

  const { data: share, error } = await supabase
    .from("catalog_shares")
    .select("id, quotes")
    .eq("id", input.shareId)
    .eq("created_by", profile.id)
    .is("revoked_at", null)
    .maybeSingle();
  if (error) return { ok: false, error: "Не удалось обновить подборку." };
  if (!share) return { ok: false, error: "Подборка уже недействительна." };

  const remove = new Set(
    (input.removeKeys ?? []).filter((key) => typeof key === "string" && key.length < 200),
  );
  const quotes = parseShareQuotes(share.quotes).filter(
    (quote, index) => !remove.has(quoteKey(quote, index)),
  );

  const addIds = input.addCalculationIds ?? [];
  if (addIds.length) {
    const loaded = await loadQuoteSnapshots(addIds);
    if (!loaded.ok) return loaded;
    const present = new Set(
      quotes.flatMap((quote) =>
        quote.calculation_id ? [quote.calculation_id] : [],
      ),
    );
    for (const quote of loaded.quotes) {
      if (quote.calculation_id && present.has(quote.calculation_id)) continue;
      quotes.push(quote);
      if (quote.calculation_id) present.add(quote.calculation_id);
    }
  }

  if (quotes.length > QUOTE_MAX) {
    return { ok: false, error: `В подборке максимум ${QUOTE_MAX} расчётов.` };
  }

  const { error: updateError } = await supabase
    .from("catalog_shares")
    .update({ quotes: quotesToJson(quotes) })
    .eq("id", input.shareId)
    .eq("created_by", profile.id);
  if (updateError) {
    return { ok: false, error: "Не удалось обновить расчёты в подборке." };
  }
  return { ok: true, quotes };
}
