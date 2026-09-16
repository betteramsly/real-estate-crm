import Link from "next/link";
import { cookies } from "next/headers";
import { Building2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { CatalogCard } from "@/components/catalog/catalog-card";
import { CatalogFilters } from "@/components/catalog/catalog-filters";
import { requireProfile } from "@/lib/auth";
import { PROPERTY_PUBLIC_COLUMNS, hasCommercialCatalog } from "@/lib/catalog";
import { isPresentCookie, PRESENT_COOKIE } from "@/lib/present-mode";
import type { Property } from "@/lib/types";

interface PageProps {
  searchParams: {
    q?: string;
    city?: string;
    developer?: string;
    completion_year?: string;
    installment?: string;
    maternity?: string;
    commercial?: string;
    large?: string;
    relevance?: string;
  };
}

export default async function PropertiesPage({ searchParams }: PageProps) {
  const { supabase } = await requireProfile();
  const presentMode = isPresentCookie(cookies().get(PRESENT_COOKIE)?.value);

  let query = supabase
    .from("properties")
    .select(PROPERTY_PUBLIC_COLUMNS)
    .order("relevance", { ascending: false, nullsFirst: false })
    .order("title", { ascending: true });

  if (searchParams.city) query = query.eq("city", searchParams.city);
  if (searchParams.developer)
    query = query.eq("developer", searchParams.developer);
  if (searchParams.completion_year)
    query = query.eq("completion_year", searchParams.completion_year);
  if (searchParams.maternity === "1") query = query.eq("maternity_capital", true);
  if (searchParams.large === "1") query = query.eq("has_large_apartments", true);
  if (searchParams.relevance === "1" || searchParams.relevance === "2" || searchParams.relevance === "3") {
    query = query.eq("relevance", Number(searchParams.relevance));
  }

  if (searchParams.q) {
    const q = `%${searchParams.q}%`;
    query = query.or(
      `title.ilike.${q},address.ilike.${q},city.ilike.${q},district.ilike.${q},description.ilike.${q},developer.ilike.${q}`,
    );
  }

  const [{ data: rows }, { data: filterRows }] = await Promise.all([
    query.returns<Property[]>(),
    supabase
      .from("properties")
      .select("city, completion_year, developer")
      .returns<Pick<Property, "city" | "completion_year" | "developer">[]>(),
  ]);

  let properties = rows ?? [];
  if (searchParams.installment === "1") {
    properties = properties.filter(
      (property) =>
        Boolean(property.installment_max) ||
        (property.catalog?.installment?.length ?? 0) > 0,
    );
  }
  if (searchParams.commercial === "1") {
    properties = properties.filter(hasCommercialCatalog);
  }

  const cities = Array.from(
    new Set((filterRows ?? []).map((row) => row.city).filter(Boolean)),
  ).sort((a, b) => a!.localeCompare(b!, "ru")) as string[];
  const years = Array.from(
    new Set(
      (filterRows ?? []).map((row) => row.completion_year).filter(Boolean),
    ),
  ).sort((a, b) => a!.localeCompare(b!, "ru")) as string[];
  const developers = Array.from(
    new Set((filterRows ?? []).map((row) => row.developer).filter(Boolean)),
  ).sort((a, b) => a!.localeCompare(b!, "ru")) as string[];

  return (
    <>
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">
            Mantaev Capital
          </p>
          <h1 className="text-3xl font-semibold tracking-tight">База ЖК</h1>
          <p className="text-sm text-muted-foreground">
            {properties.length} комплексов · удобно показывать с телефона и на встрече
          </p>
        </div>
        {presentMode ? null : (
          <Button asChild>
            <Link href="/properties/new">
              <Plus className="h-4 w-4" />
              Добавить объект
            </Link>
          </Button>
        )}
      </div>

      <CatalogFilters cities={cities} developers={developers} years={years} />

      {properties.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {properties.map((property) => (
            <CatalogCard key={property.id} property={property} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<Building2 className="h-5 w-5" />}
          title="ЖК не найдены"
          description="Измените фильтры или добавьте новый комплекс."
          action={
            presentMode ? undefined : (
              <Button asChild>
                <Link href="/properties/new">
                  <Plus className="h-4 w-4" />
                  Добавить объект
                </Link>
              </Button>
            )
          }
        />
      )}
    </>
  );
}
