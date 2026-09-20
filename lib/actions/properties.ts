"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { canManageProperties, requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/activities";
import {
  catalogDocumentLabel,
  inferCatalogDocumentKind,
} from "@/lib/catalog";
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

const DOCUMENT_MAX_BYTES = 10 * 1024 * 1024;
const IMAGE_MAX_BYTES = 10 * 1024 * 1024;
const IMAGE_MIME_TYPES = new Set([
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/webp",
]);
const DOCUMENT_MIME_TYPES = new Set([
  "application/pdf",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "image/gif",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

const propertySchema = z.object({
  title: z.string().trim().min(2, "Минимум 2 символа").max(180),
  rooms: z.number().int().min(1).max(4).nullable().optional(),
  address: z.string().max(500).nullable().optional(),
  city: z.string().max(100).nullable().optional(),
  district: z.string().max(100).nullable().optional(),
  description: z.string().max(10_000).nullable().optional(),
  developer: z.string().max(160).nullable().optional(),
  completion_year: z.string().max(80).nullable().optional(),
  installment_max: z.string().max(80).nullable().optional(),
  maternity_capital: z.boolean().nullable().optional(),
  cash_payment: z.boolean().nullable().optional(),
  relevance: z.union([z.literal(1), z.literal(2), z.literal(3), z.null()]).optional(),
});

const uuidSchema = z.string().uuid();
const catalogPairSchema = z.object({
  label: z.string().max(160),
  value: z.string().max(1000),
});
const catalogPairsSchema = z.array(catalogPairSchema).max(100);
const catalogDocumentSchema = z.object({
  title: z.string().max(200),
  url: z.string().max(2048),
  kind: z
    .enum(["plan", "price", "chess", "commercial", "map", "other"])
    .optional()
    .default("other"),
});
const catalogDocumentsSchema = z.array(catalogDocumentSchema).max(100);
const photoOrderSchema = z.array(z.string().max(2048)).max(200);

export type PropertyFormState = {
  error?: string;
  success?: boolean;
  fieldErrors?: Record<string, string>;
  redirectTo?: string;
};

function parseOptionalBoolean(value: FormDataEntryValue | null) {
  if (value === "true") return true;
  if (value === "false") return false;
  return null;
}

function parseJson<T>(
  raw: FormDataEntryValue | null,
  schema: z.ZodType<T>,
  fallback: T,
): T {
  if (typeof raw !== "string" || !raw.trim()) return fallback;
  try {
    const parsed = schema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : fallback;
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

function fileExtension(file: File) {
  const fromName = file.name.split(".").pop()?.toLowerCase();
  if (fromName && /^[a-z0-9]{1,8}$/.test(fromName)) return fromName;
  if (file.type.includes("pdf")) return "pdf";
  if (file.type.includes("png")) return "png";
  if (file.type.includes("webp")) return "webp";
  if (file.type.includes("gif")) return "gif";
  if (file.type.includes("sheet") || file.type.includes("excel")) return "xlsx";
  return "jpg";
}

function validateDocumentFiles(files: File[]) {
  for (const file of files) {
    if (file.size > DOCUMENT_MAX_BYTES) {
      return `Файл «${file.name}» больше 10 МБ`;
    }
    if (!DOCUMENT_MIME_TYPES.has(file.type.toLowerCase())) {
      return `Формат «${file.name}» не поддерживается`;
    }
  }
  return null;
}

function validateImageFiles(files: File[]) {
  for (const file of files) {
    if (file.size > IMAGE_MAX_BYTES) {
      return `Изображение «${file.name}» больше 10 МБ`;
    }
    if (!IMAGE_MIME_TYPES.has(file.type.toLowerCase())) {
      return `Формат изображения «${file.name}» не поддерживается`;
    }
  }
  return null;
}

function isNextRedirect(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    typeof (error as { digest?: unknown }).digest === "string" &&
    (error as { digest: string }).digest.startsWith("NEXT_REDIRECT")
  );
}

function buildCatalog(formData: FormData, extras: {
  photos: string[];
  pricePhotos: string[];
  locationPhotos: string[];
  documents?: CatalogDocument[];
}): PropertyCatalog {
  const facts = cleanPairs(
    parseJson(formData.get("facts_json"), catalogPairsSchema, []),
  );
  const installmentItems = cleanPairs(
    parseJson(formData.get("installment_json"), catalogPairsSchema, []),
  );
  const commercialItems = cleanPairs(
    parseJson(formData.get("commercial_json"), catalogPairsSchema, []),
  );
  const documents = [
    ...parseJson(formData.get("documents_json"), catalogDocumentsSchema, []),
    ...(extras.documents ?? []),
  ]
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
    title: parseStringFormValue(get("title")) ?? "",
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
  const paths: string[] = [];
  for (const file of files) {
    const ext = file.type.includes("png")
      ? "png"
      : file.type.includes("webp")
        ? "webp"
        : file.type.includes("gif")
          ? "gif"
          : "jpg";
    const path = `${propertyId}/${folder}/${randomUUID()}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    const { error } = await supabase.storage
      .from("complexes")
      .upload(path, buffer, { contentType: file.type, upsert: false });
    if (error) {
      return {
        urls,
        paths,
        error: `Не удалось загрузить «${file.name}»`,
      };
    }
    const { data } = supabase.storage.from("complexes").getPublicUrl(path);
    paths.push(path);
    urls.push(data.publicUrl);
  }
  return { urls, paths };
}

async function collectMedia(
  supabase: Awaited<ReturnType<typeof createClient>>,
  propertyId: string,
  formData: FormData,
) {
  const uploadedPaths: string[] = [];
  const gallery = await uploadFiles(
    supabase,
    propertyId,
    "gallery",
    filesOf(formData, "photo_files"),
  );
  uploadedPaths.push(...gallery.paths);
  if (gallery.error) return { error: gallery.error, uploadedPaths };
  const photos = mergePhotoOrder(
    parseJson(formData.get("photos_json"), photoOrderSchema, []),
    gallery.urls,
  );

  const location = await uploadFiles(
    supabase,
    propertyId,
    "location",
    filesOf(formData, "location_files"),
  );
  uploadedPaths.push(...location.paths);
  if (location.error) return { error: location.error, uploadedPaths };
  const locationPhotos = mergePhotoOrder(
    parseJson(formData.get("location_photos_json"), photoOrderSchema, []),
    location.urls,
  );

  const prices = await uploadFiles(
    supabase,
    propertyId,
    "price",
    filesOf(formData, "price_files"),
  );
  uploadedPaths.push(...prices.paths);
  if (prices.error) return { error: prices.error, uploadedPaths };
  const pricePhotos = mergePhotoOrder(
    parseJson(formData.get("price_photos_json"), photoOrderSchema, []),
    prices.urls,
  );
  return { photos, locationPhotos, pricePhotos, uploadedPaths };
}

async function uploadDocuments(
  supabase: Awaited<ReturnType<typeof createClient>>,
  propertyId: string,
  files: File[],
): Promise<{ documents: CatalogDocument[]; paths: string[]; error?: string }> {
  const documents: CatalogDocument[] = [];
  const paths: string[] = [];
  for (const file of files) {
    const ext = fileExtension(file);
    const kind = inferCatalogDocumentKind(file.name);
    const path = `${propertyId}/docs/${randomUUID()}.${ext}`;
    const buffer = Buffer.from(await file.arrayBuffer());
    const { error } = await supabase.storage.from("complexes").upload(path, buffer, {
      contentType: file.type,
      upsert: false,
    });
    if (error) {
      return {
        documents,
        paths,
        error: `Не удалось загрузить «${file.name}»`,
      };
    }
    const { data } = supabase.storage.from("complexes").getPublicUrl(path);
    paths.push(path);
    documents.push({
      title: catalogDocumentLabel(kind, file.name.replace(/\.[^.]+$/, "")),
      url: data.publicUrl,
      kind,
    });
  }
  return { documents, paths };
}

async function cleanupUploads(
  supabase: Awaited<ReturnType<typeof createClient>>,
  paths: string[],
) {
  if (paths.length) await supabase.storage.from("complexes").remove(paths);
}

async function rollbackCreatedProperty(
  supabase: Awaited<ReturnType<typeof createClient>>,
  propertyId: string,
  paths: string[],
) {
  await cleanupUploads(supabase, paths);
  await supabase.from("properties").delete().eq("id", propertyId);
}

async function removePropertyUploads(
  supabase: Awaited<ReturnType<typeof createClient>>,
  propertyId: string,
) {
  const paths: string[] = [];
  for (const folder of ["gallery", "location", "price", "docs"]) {
    const { data } = await supabase.storage
      .from("complexes")
      .list(`${propertyId}/${folder}`, { limit: 1000 });
    for (const object of data ?? []) {
      if (object.name) paths.push(`${propertyId}/${folder}/${object.name}`);
    }
  }
  await cleanupUploads(supabase, paths);
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
  try {
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
    const documentFiles = filesOf(formData, "document_files");
    const documentsError = validateDocumentFiles(documentFiles);
    if (documentsError) return { error: documentsError };
    const imageError = validateImageFiles([
      ...filesOf(formData, "photo_files"),
      ...filesOf(formData, "location_files"),
      ...filesOf(formData, "price_files"),
    ]);
    if (imageError) return { error: imageError };

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

    if (error || !created) return { error: "Не удалось создать объект" };

    const media = await collectMedia(supabase, created.id, formData);
    if ("error" in media) {
      await rollbackCreatedProperty(supabase, created.id, media.uploadedPaths);
      return { error: media.error };
    }
    const uploaded = await uploadDocuments(
      supabase,
      created.id,
      documentFiles,
    );
    const uploadedPaths = [...media.uploadedPaths, ...uploaded.paths];
    if (uploaded.error) {
      await rollbackCreatedProperty(supabase, created.id, uploadedPaths);
      return { error: uploaded.error };
    }
    const catalog = buildCatalog(formData, {
      ...media,
      documents: uploaded.documents,
    });
    const { data: saved, error: catalogError } = await supabase
      .from("properties")
      .update({
        catalog,
        cover_url: media.photos[0] ?? null,
      })
      .eq("id", created.id)
      .select("id")
      .maybeSingle();
    if (catalogError || !saved) {
      await rollbackCreatedProperty(supabase, created.id, uploadedPaths);
      return { error: "Не удалось сохранить карточку объекта" };
    }

    await logActivity({
      entityType: "property",
      entityId: created.id,
      type: "created",
      payload: { title: parsed.data.title },
      propertyId: created.id,
    });

    revalidatePath("/properties");
    return {
      success: true,
      redirectTo: `/properties/${created.id}?created=property`,
    };
  } catch (error) {
    if (isNextRedirect(error)) throw error;
    return {
      error:
        error instanceof Error ? error.message : "Не удалось создать объект",
    };
  }
}

export async function updatePropertyAction(
  id: string,
  _prev: PropertyFormState,
  formData: FormData,
): Promise<PropertyFormState> {
  if (!uuidSchema.safeParse(id).success) {
    return { error: "Объект не найден" };
  }
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
  const documentFiles = filesOf(formData, "document_files");
  const documentsError = validateDocumentFiles(documentFiles);
  if (documentsError) return { error: documentsError };
  const imageError = validateImageFiles([
    ...filesOf(formData, "photo_files"),
    ...filesOf(formData, "location_files"),
    ...filesOf(formData, "price_files"),
  ]);
  if (imageError) return { error: imageError };

  const { data: existing, error: existingError } = await supabase
    .from("properties")
    .select("id")
    .eq("id", id)
    .maybeSingle();
  if (existingError || !existing) return { error: "Объект не найден" };

  const media = await collectMedia(supabase, id, formData);
  if ("error" in media) {
    await cleanupUploads(supabase, media.uploadedPaths);
    return { error: media.error };
  }
  const uploaded = await uploadDocuments(
    supabase,
    id,
    documentFiles,
  );
  const uploadedPaths = [...media.uploadedPaths, ...uploaded.paths];
  if (uploaded.error) {
    await cleanupUploads(supabase, uploadedPaths);
    return { error: uploaded.error };
  }
  const catalog = buildCatalog(formData, {
    ...media,
    documents: uploaded.documents,
  });

  const { data: updated, error } = await supabase
    .from("properties")
    .update({
      ...parsed.data,
      catalog,
      cover_url: media.photos[0] ?? null,
      internal: parseInternal(formData),
    })
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error || !updated) {
    await cleanupUploads(supabase, uploadedPaths);
    return { error: "Не удалось сохранить объект" };
  }

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
  if (!uuidSchema.safeParse(id).success) {
    throw new Error("Объект не найден");
  }
  const { supabase, allowed } = await requirePropertyManager();
  if (!allowed) redirect("/properties");
  const { data: deleted, error } = await supabase
    .from("properties")
    .delete()
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error || !deleted) throw new Error("Объект не найден или недоступен");
  await removePropertyUploads(supabase, id);
  await logActivity({
    entityType: "property",
    entityId: id,
    type: "deleted",
  });
  revalidatePath("/properties");
  redirect("/properties");
}
