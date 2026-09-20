import type { SupabaseClient } from "@supabase/supabase-js";

export const CATALOG_FILTER_OPTION_KINDS = [
  "city",
  "district",
  "developer",
  "completion_year",
  "installment",
] as const;

export type CatalogFilterExtraKey = (typeof CATALOG_FILTER_OPTION_KINDS)[number];

export type CatalogFilterExtras = Record<CatalogFilterExtraKey, string[]>;

export const EMPTY_CATALOG_FILTER_EXTRAS: CatalogFilterExtras = {
  city: [],
  district: [],
  developer: [],
  completion_year: [],
  installment: [],
};

const MAX_LENGTH = 80;

export function normalizeFilterOption(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export function isCatalogFilterExtraKey(
  value: string,
): value is CatalogFilterExtraKey {
  return (CATALOG_FILTER_OPTION_KINDS as readonly string[]).includes(value);
}

export function filterOptionError(value: string) {
  const cleaned = normalizeFilterOption(value);
  if (!cleaned) return "Введите значение";
  if (cleaned.length > MAX_LENGTH) return `Не длиннее ${MAX_LENGTH} символов`;
  return null;
}

function uniqueSorted(values: string[]) {
  return Array.from(
    new Set(values.map(normalizeFilterOption).filter(Boolean)),
  ).sort((a, b) => a.localeCompare(b, "ru"));
}

export function groupCatalogFilterOptions(
  rows: Array<{ kind: string; value: string }>,
): CatalogFilterExtras {
  const next: CatalogFilterExtras = {
    city: [],
    district: [],
    developer: [],
    completion_year: [],
    installment: [],
  };
  for (const row of rows) {
    if (!isCatalogFilterExtraKey(row.kind)) continue;
    const value = normalizeFilterOption(row.value);
    if (!value) continue;
    next[row.kind].push(value);
  }
  for (const key of CATALOG_FILTER_OPTION_KINDS) {
    next[key] = uniqueSorted(next[key]);
  }
  return next;
}

export function mergeFilterOptions(base: string[], extras: string[] = []) {
  return uniqueSorted([...base, ...extras]);
}

export async function loadCatalogFilterExtras(
  supabase: SupabaseClient,
): Promise<CatalogFilterExtras> {
  const { data, error } = await supabase
    .from("catalog_filter_options")
    .select("kind, value");
  if (error) throw new Error(error.message);
  return groupCatalogFilterOptions(
    (data ?? []) as Array<{ kind: string; value: string }>,
  );
}

export function isFilterExtra(
  extras: CatalogFilterExtras,
  key: CatalogFilterExtraKey,
  value: string,
) {
  const cleaned = normalizeFilterOption(value).toLowerCase();
  return extras[key].some((item) => item.toLowerCase() === cleaned);
}
