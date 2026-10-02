import { PrefetchLink } from "@/components/prefetch-link";
import { cookies } from "next/headers";
import { Plus } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import {
  CatalogExplorer,
  CatalogMatchCount,
} from "@/components/catalog/catalog-explorer";
import { canManageProperties, requireProfile } from "@/lib/auth";
import {
  CATALOG_LIST_COLUMNS,
  catalogListProperty,
  type CatalogListRow,
} from "@/lib/catalog";
import { catalogInitialSearch } from "@/lib/catalog-browse";
import { loadCatalogFilterExtras } from "@/lib/catalog-filter-options";
import { isPresentCookie, PRESENT_COOKIE } from "@/lib/present-mode";

// Keep the opened catalog in the browser so the breadcrumb back from a
// complex does not download the list again.
export const unstable_dynamicStaleTime = 300;

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

  const [{ data: rows }, extras] = await Promise.all([
    supabase
      .from("properties")
      .select(CATALOG_LIST_COLUMNS)
      .order("relevance", { ascending: false, nullsFirst: false })
      .order("title", { ascending: true })
      .returns<CatalogListRow[]>(),
    loadCatalogFilterExtras(supabase),
  ]);
  const properties = (rows ?? []).map(catalogListProperty);

  return (
    <CatalogExplorer
      properties={properties}
      initialSearch={catalogInitialSearch(searchParams)}
      hideRelevance={presentMode}
      canEdit={canEdit}
      extras={extras}
      canAddFilters={canEdit}
    >
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="space-y-1">
          <p className="text-xs font-medium uppercase tracking-[0.22em] text-muted-foreground">
            MANTAEV CAPITAL
          </p>
          <h1 className="font-display text-3xl font-semibold tracking-tight">
            {presentMode ? "Каталог" : "База ЖК"}
          </h1>
          <p className="text-sm text-muted-foreground">
            <CatalogMatchCount />
          </p>
        </div>
        {canEdit ? (
          <PrefetchLink href="/properties/new" className={buttonVariants()}>
            <Plus className="h-4 w-4" />
            Добавить объект
          </PrefetchLink>
        ) : null}
      </div>
    </CatalogExplorer>
  );
}
