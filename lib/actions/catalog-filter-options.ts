"use server";

import { revalidatePath } from "next/cache";
import { canManageProperties, requireProfile } from "@/lib/auth";
import {
  filterOptionError,
  isCatalogFilterExtraKey,
  normalizeFilterOption,
  type CatalogFilterExtraKey,
} from "@/lib/catalog-filter-options";

export type CatalogFilterOptionResult = { error?: string };

function revalidateCatalog() {
  revalidatePath("/properties");
  revalidatePath("/properties/new");
  revalidatePath("/properties/[id]", "page");
}

async function requireFilterEditor() {
  const ctx = await requireProfile();
  if (!canManageProperties(ctx.profile.role)) {
    return { ...ctx, allowed: false as const };
  }
  return { ...ctx, allowed: true as const };
}

export async function addCatalogFilterOptionAction(
  kind: string,
  value: string,
): Promise<CatalogFilterOptionResult> {
  if (!isCatalogFilterExtraKey(kind)) return { error: "Некорректный фильтр" };
  const invalid = filterOptionError(value);
  if (invalid) return { error: invalid };
  const cleaned = normalizeFilterOption(value);

  const { supabase, user, allowed } = await requireFilterEditor();
  if (!allowed) return { error: "Недостаточно прав" };

  const { error } = await supabase.from("catalog_filter_options").insert({
    kind,
    value: cleaned,
    created_by: user.id,
  });
  if (error && error.code !== "23505") {
    return { error: error.message || "Не удалось сохранить" };
  }

  revalidateCatalog();
  return {};
}

export async function removeCatalogFilterOptionAction(
  kind: string,
  value: string,
): Promise<CatalogFilterOptionResult> {
  if (!isCatalogFilterExtraKey(kind)) return { error: "Некорректный фильтр" };
  const cleaned = normalizeFilterOption(value);
  if (!cleaned) return { error: "Введите значение" };

  const { supabase, allowed } = await requireFilterEditor();
  if (!allowed) return { error: "Недостаточно прав" };

  const { data, error: readError } = await supabase
    .from("catalog_filter_options")
    .select("id, value")
    .eq("kind", kind satisfies CatalogFilterExtraKey);
  if (readError) return { error: readError.message || "Не удалось удалить" };

  const needle = cleaned.toLowerCase();
  const ids = (data ?? [])
    .filter((row) => normalizeFilterOption(row.value).toLowerCase() === needle)
    .map((row) => row.id);
  if (!ids.length) return {};

  const { error } = await supabase
    .from("catalog_filter_options")
    .delete()
    .in("id", ids);
  if (error) return { error: error.message || "Не удалось удалить" };

  revalidateCatalog();
  return {};
}
