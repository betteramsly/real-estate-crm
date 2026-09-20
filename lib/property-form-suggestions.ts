import { sortInstallmentTerms } from "@/lib/catalog";
import {
  loadCatalogFilterExtras,
  mergeFilterOptions,
  type CatalogFilterExtras,
} from "@/lib/catalog-filter-options";
import type { SupabaseClient } from "@supabase/supabase-js";

export type PropertyFormSuggestions = {
  cities: string[];
  districts: string[];
  developers: string[];
  years: string[];
  installments: string[];
  extras: CatalogFilterExtras;
};

function uniqueSorted(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) =>
    a!.localeCompare(b!, "ru"),
  ) as string[];
}

export async function loadPropertyFormSuggestions(
  supabase: SupabaseClient,
): Promise<PropertyFormSuggestions> {
  const [{ data }, extras] = await Promise.all([
    supabase
      .from("properties")
      .select("city, district, completion_year, developer, installment_max"),
    loadCatalogFilterExtras(supabase),
  ]);

  const rows = (data ?? []) as Array<{
    city: string | null;
    district: string | null;
    completion_year: string | null;
    developer: string | null;
    installment_max: string | null;
  }>;

  return {
    cities: mergeFilterOptions(
      uniqueSorted(rows.map((row) => row.city)),
      extras.city,
    ),
    districts: mergeFilterOptions(
      uniqueSorted(rows.map((row) => row.district)),
      extras.district,
    ),
    developers: mergeFilterOptions(
      uniqueSorted(rows.map((row) => row.developer)),
      extras.developer,
    ),
    years: mergeFilterOptions(
      uniqueSorted(rows.map((row) => row.completion_year)),
      extras.completion_year,
    ),
    installments: sortInstallmentTerms(
      mergeFilterOptions(
        uniqueSorted(rows.map((row) => row.installment_max)),
        extras.installment,
      ),
    ),
    extras,
  };
}
import "server-only";
