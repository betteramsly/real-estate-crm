import { sortInstallmentTerms } from "@/lib/catalog";
import type { SupabaseClient } from "@supabase/supabase-js";

export type PropertyFormSuggestions = {
  cities: string[];
  districts: string[];
  developers: string[];
  years: string[];
  installments: string[];
};

function uniqueSorted(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) =>
    a!.localeCompare(b!, "ru"),
  ) as string[];
}

export async function loadPropertyFormSuggestions(
  supabase: SupabaseClient,
): Promise<PropertyFormSuggestions> {
  const { data } = await supabase
    .from("properties")
    .select("city, district, completion_year, developer, installment_max");

  const rows = (data ?? []) as Array<{
    city: string | null;
    district: string | null;
    completion_year: string | null;
    developer: string | null;
    installment_max: string | null;
  }>;

  return {
    cities: uniqueSorted(rows.map((row) => row.city)),
    districts: uniqueSorted(rows.map((row) => row.district)),
    developers: uniqueSorted(rows.map((row) => row.developer)),
    years: uniqueSorted(rows.map((row) => row.completion_year)),
    installments: sortInstallmentTerms(
      uniqueSorted(rows.map((row) => row.installment_max)),
    ),
  };
}
