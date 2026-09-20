import { PrefetchLink } from "@/components/prefetch-link";
import { cookies } from "next/headers";
import { Building2, Plus } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { CatalogExplorer } from "@/components/catalog/catalog-explorer";
import { CatalogGrid } from "@/components/catalog/catalog-grid";
import { canManageProperties, requireProfile } from "@/lib/auth";
import {
  PROPERTY_PUBLIC_COLUMNS,
  hasCommercialCatalog,
  matchesCatalogSearch,
  slimCatalogCard,
  sortInstallmentTerms,
} from "@/lib/catalog";
import { loadCatalogFilterExtras } from "@/lib/catalog-filter-options";
import { isPresentCookie, PRESENT_COOKIE } from "@/lib/present-mode";
import type { Property } from "@/lib/types";

interface PageProps {
  searchParams: Promise<{
    q?: string;
    city?: string;
    district?: string;
    developer?: string;
    completion_year?: string;
    installment?: string;
    maternity?: string;
    cash?: string;
    commercial?: string;
    large?: string;
    relevance?: string;
  }>;
}

export default async function PropertiesPage(props: PageProps) {
  const searchParams = await props.searchParams;
  const { supabase, profile } = await requireProfile();
  const presentMode = isPresentCookie(
    (await cookies()).get(PRESENT_COOKIE)?.value,
  );
  const canEdit = canManageProperties(profile.role) && !presentMode;

  let query = supabase
    .from("properties")
    .select(PROPERTY_PUBLIC_COLUMNS)
    .order("relevance", { ascending: false, nullsFirst: false })
    .order("title", { ascending: true });

  const citiesFilter = csv(searchParams.city);
  const districtsFilter = csv(searchParams.district);
  const developersFilter = csv(searchParams.developer);
  const yearsFilter = csv(searchParams.completion_year);
  const installmentFilter = csv(searchParams.installment).filter(
    (value) => value !== "1",
  );
  const installmentAny = csv(searchParams.installment).includes("1");
  const relevanceFilter = csv(searchParams.relevance)
    .map(Number)
    .filter((value) => value === 1 || value === 2 || value === 3);
  if (citiesFilter.length) query = query.in("city", citiesFilter);
  if (districtsFilter.length) query = query.in("district", districtsFilter);
  if (developersFilter.length) query = query.in("developer", developersFilter);
  if (yearsFilter.length) query = query.in("completion_year", yearsFilter);
  if (installmentFilter.length) {
    query = query.in("installment_max", installmentFilter);
  } else if (installmentAny) {
    query = query.not("installment_max", "is", null);
  }
  if (searchParams.maternity === "1") query = query.eq("maternity_capital", true);
  if (searchParams.cash === "1") query = query.eq("cash_payment", true);
  if (searchParams.large === "1") query = query.eq("has_large_apartments", true);
  if (relevanceFilter.length) query = query.in("relevance", relevanceFilter);

  const [{ data: rows }, { data: filterRows }, extras] = await Promise.all([
    query.returns<Property[]>(),
    supabase
      .from("properties")
      .select("city, district, completion_year, developer, installment_max")
      .returns<
        Pick<
          Property,
          "city" | "district" | "completion_year" | "developer" | "installment_max"
        >[]
      >(),
    loadCatalogFilterExtras(supabase),
  ]);

  let properties = rows ?? [];
  if (searchParams.q) {
    properties = properties.filter((property) =>
      matchesCatalogSearch(property, searchParams.q!),
    );
  }
  if (searchParams.commercial === "1") {
    properties = properties.filter(hasCommercialCatalog);
  }
  properties = properties.map(slimCatalogCard);

  const cities = uniqueSorted((filterRows ?? []).map((row) => row.city));
  const districts = uniqueSorted((filterRows ?? []).map((row) => row.district));
  const years = uniqueSorted((filterRows ?? []).map((row) => row.completion_year));
  const developers = uniqueSorted((filterRows ?? []).map((row) => row.developer));
  const installments = sortInstallmentTerms(
    uniqueSorted((filterRows ?? []).map((row) => row.installment_max)),
  );

  return (
    <>
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">
            MANTAEV CAPITAL
          </p>
          <h1 className="font-display text-3xl font-semibold tracking-tight">
            {presentMode ? "Каталог" : "База ЖК"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {properties.length} комплексов
          </p>
        </div>
        {canEdit ? (
          <PrefetchLink href="/properties/new" className={buttonVariants()}>
            <Plus className="h-4 w-4" />
            Добавить объект
          </PrefetchLink>
        ) : null}
      </div>

      <CatalogExplorer
        cities={cities}
        districts={districts}
        developers={developers}
        years={years}
        installments={installments}
        extras={extras}
        canAddFilters={canEdit}
      >
        {properties.length > 0 ? (
          <CatalogGrid
            properties={properties}
            hideRelevance={presentMode}
          />
        ) : (
          <EmptyState
            icon={<Building2 className="h-5 w-5" />}
            title="ЖК не найдены"
            description={
              canEdit
                ? "Измените фильтры или добавьте новый комплекс."
                : "Измените фильтры, чтобы найти комплекс."
            }
            action={
              canEdit ? (
                <PrefetchLink href="/properties/new" className={buttonVariants()}>
                  <Plus className="h-4 w-4" />
                  Добавить объект
                </PrefetchLink>
              ) : undefined
            }
          />
        )}
      </CatalogExplorer>
    </>
  );
}

function csv(value?: string) {
  return (value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function uniqueSorted(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.filter(Boolean))).sort((a, b) =>
    a!.localeCompare(b!, "ru"),
  ) as string[];
}
