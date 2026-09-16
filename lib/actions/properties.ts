"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { canManageProperties, requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/actions/activities";
import { parseNumericFormValue, parseStringFormValue } from "@/lib/parse";
import { mergePhotoOrder } from "@/lib/photo-order";
import type {
  CatalogDocument,
  CatalogDocumentKind,
  CatalogFact,
  CatalogTermItem,
  PropertyCatalog,
  PropertyInternal,
} from "@/lib/types";

const propertySchema = z.object({
  title: z.string().min(2, "Минимум 2 символа"),
  rooms: z.number().int().min(1).max(4).nullable().optional(),
  address: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  district: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  developer: z.string().nullable().optional(),
  completion_year: z.string().nullable().optional(),
  installment_max: z.string().nullable().optional(),
  maternity_capital: z.boolean().nullable().optional(),
  cash_payment: z.boolean().nullable().optional(),
  relevance: z.union([z.literal(1), z.literal(2), z.literal(3), z.null()]).optional(),
});

export type PropertyFormState = {
  error?: string;
  success?: boolean;
  fieldErrors?: Record<string, string>;
};

function parseOptionalBoolean(value: FormDataEntryValue | null) {
  if (value === "true") return true;
  if (value === "false") return false;
  return null;
}

function parseJson<T>(raw: FormDataEntryValue | null, fallback: T): T {
  if (typeof raw !== "string" || !raw.trim()) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function cleanPairs(items: CatalogFact[] | CatalogTermItem[]) {
  return items.filter((item) => item.label.trim() || item.value.trim());
}

function filesOf(formData: FormData, name: string) {
  return formData
    .getAll(name)
    .filter((value): value is File => value instanceof File && value.size > 0);
}

function buildCatalog(formData: FormData, extras: {
  photos: string[];
  pricePhotos: string[];
  locationPhotos: string[];
}): PropertyCatalog {
  const facts = cleanPairs(parseJson<CatalogFact[]>(formData.get("facts_json"), []));
  const installmentItems = cleanPairs(
    parseJson<CatalogTermItem[]>(formData.get("installment_json"), []),
  );
  const commercialItems = cleanPairs(
    parseJson<CatalogTermItem[]>(formData.get("commercial_json"), []),
  );
  const documents = parseJson<CatalogDocument[]>(formData.get("documents_json"), [])
    .filter((doc) => doc.url.trim())
    .map((doc) => ({
      title: doc.title.trim() || "Документ",
      url: doc.url.trim(),
      kind: (doc.kind ?? "other") as CatalogDocumentKind,
    }));
  const about = parseStringFormValue(formData.get("about"));
  const mapUrl = parseStringFormValue(formData.get("map_url"));
  const address = parseStringFormValue(formData.get("address"));
  const installmentNote = parseStringFormValue(formData.get("installment_note"));
  const commercialNote = parseStringFormValue(formData.get("commercial_note"));

  return {
    about: about ?? undefined,
    facts: facts.length ? facts : undefined,
    installment:
      installmentItems.length || installmentNote
        ? [
            {
              title: "Рассрочка",
              items: installmentItems,
              note: installmentNote ?? undefined,
            },
          ]
        : undefined,
    commercial:
      commercialItems.length || commercialNote
        ? [
            {
              title: "Коммерция",
              items: commercialItems,
              note: commercialNote ?? undefined,
            },
          ]
        : undefined,
    documents: documents.length ? documents : undefined,
    photos: extras.photos,
    price_photos: extras.pricePhotos,
    location: {
      address: address ?? undefined,
      map_url: mapUrl ?? undefined,
      photos: extras.locationPhotos,
    },
  };
}

function parseCore(formData: FormData) {
  const get = (key: string) => formData.get(key);
  return {
    title: (get("title") as string) ?? "",
    rooms: parseNumericFormValue(get("rooms")),
    address: parseStringFormValue(get("address")),
    city: parseStringFormValue(get("city")),
    district: parseStringFormValue(get("district")),
    description: parseStringFormValue(get("about")),
    developer: parseStringFormValue(get("developer")),
    completion_year: parseStringFormValue(get("completion_year")),
    installment_max: parseStringFormValue(get("installment_max")),
    maternity_capital: parseOptionalBoolean(get("maternity_capital")),
    cash_payment: parseOptionalBoolean(get("cash_payment")),
    relevance: (() => {
      const raw = parseStringFormValue(get("relevance"));
      if (raw === "1" || raw === "2" || raw === "3") {
        return Number(raw) as 1 | 2 | 3;
      }
      return null;
    })(),
  };
}

function parseInternal(formData: FormData): PropertyInternal {
  return {
    commission: parseStringFormValue(formData.get("commission")) ?? undefined,
    investor: parseStringFormValue(formData.get("investor")) ?? undefined,
    stop_sales: parseStringFormValue(formData.get("stop_sales")) ?? undefined,
    notes: parseStringFormValue(formData.get("notes")) ?? undefined,
  };
}

async function uploadFiles(
  supabase: Awaited<ReturnType<typeof createClient>>,
  propertyId: string,
  folder: string,
  files: File[],
) {
  const urls: string[] = [];
  for (const [index, file] of files.entries()) {
    const ext = file.type.includes("png")
      ? "png"
      : file.type.includes("webp")
        ? "webp"
        : "jpg";
    const path = `${propertyId}/${folder}/${Date.now()}-${index}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    const { error } = await supabase.storage
      .from("complexes")
      .upload(path, buffer, { contentType: file.type || "image/jpeg", upsert: true });
    if (error) continue;
    const { data } = supabase.storage.from("complexes").getPublicUrl(path);
    urls.push(data.publicUrl);
  }
  return urls;
}

async function collectMedia(
  supabase: Awaited<ReturnType<typeof createClient>>,
  propertyId: string,
  formData: FormData,
) {
  const photos = mergePhotoOrder(
    parseJson<string[]>(formData.get("photos_json"), []),
    await uploadFiles(supabase, propertyId, "gallery", filesOf(formData, "photo_files")),
  );
  const locationPhotos = mergePhotoOrder(
    parseJson<string[]>(formData.get("location_photos_json"), []),
    await uploadFiles(
      supabase,
      propertyId,
      "location",
      filesOf(formData, "location_files"),
    ),
  );
  const pricePhotos = mergePhotoOrder(
    parseJson<string[]>(formData.get("price_photos_json"), []),
    await uploadFiles(supabase, propertyId, "price", filesOf(formData, "price_files")),
  );
  return { photos, locationPhotos, pricePhotos };
}

async function requirePropertyManager() {
  const ctx = await requireProfile();
  if (!canManageProperties(ctx.profile.role)) {
    return { ...ctx, allowed: false as const };
  }
  return { ...ctx, allowed: true as const };
}

export async function createPropertyAction(
  _prev: PropertyFormState,
  formData: FormData,
): Promise<PropertyFormState> {
  const parsed = propertySchema.safeParse(parseCore(formData));
  if (!parsed.success) {
    return {
      error: "Проверьте поля формы",
      fieldErrors: Object.fromEntries(
        parsed.error.errors.map((error) => [error.path.join("."), error.message]),
      ),
    };
  }

  const { supabase, user, allowed } = await requirePropertyManager();
  if (!allowed) return { error: "Недостаточно прав" };

  const { data: created, error } = await supabase
    .from("properties")
    .insert({
      ...parsed.data,
      property_type: "apartment",
      listing_type: "sale",
      status: "active",
      price: 0,
      assigned_to: user.id,
      created_by: user.id,
      catalog: {},
      internal: parseInternal(formData),
    })
    .select("id")
    .single();

  if (error || !created) return { error: error?.message ?? "Не удалось создать" };

  const media = await collectMedia(supabase, created.id, formData);
  const catalog = buildCatalog(formData, media);
  await supabase
    .from("properties")
    .update({
      catalog,
      cover_url: media.photos[0] ?? null,
    })
    .eq("id", created.id);

  await logActivity({
    entityType: "property",
    entityId: created.id,
    type: "created",
    payload: { title: parsed.data.title },
    propertyId: created.id,
  });

  revalidatePath("/properties");
  redirect(`/properties/${created.id}?created=property`);
}

export async function updatePropertyAction(
  id: string,
  _prev: PropertyFormState,
  formData: FormData,
): Promise<PropertyFormState> {
  const parsed = propertySchema.safeParse(parseCore(formData));
  if (!parsed.success) {
    return {
      error: "Проверьте поля формы",
      fieldErrors: Object.fromEntries(
        parsed.error.errors.map((error) => [error.path.join("."), error.message]),
      ),
    };
  }

  const { supabase, allowed } = await requirePropertyManager();
  if (!allowed) return { error: "Недостаточно прав" };

  const media = await collectMedia(supabase, id, formData);
  const catalog = buildCatalog(formData, media);

  const { error } = await supabase
    .from("properties")
    .update({
      ...parsed.data,
      catalog,
      cover_url: media.photos[0] ?? null,
      internal: parseInternal(formData),
    })
    .eq("id", id);

  if (error) return { error: error.message };

  await logActivity({
    entityType: "property",
    entityId: id,
    type: "updated",
    payload: { title: parsed.data.title },
    propertyId: id,
  });

  revalidatePath("/properties");
  revalidatePath(`/properties/${id}`);
  return { success: true };
}

export async function deletePropertyAction(id: string) {
  const { supabase, allowed } = await requirePropertyManager();
  if (!allowed) redirect("/properties");
  const { error } = await supabase.from("properties").delete().eq("id", id);
  if (error) throw new Error(error.message);
  await logActivity({
    entityType: "property",
    entityId: id,
    type: "deleted",
  });
  revalidatePath("/properties");
  redirect("/properties");
}
