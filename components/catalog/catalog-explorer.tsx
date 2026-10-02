"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { Building2, Loader2, Plus } from "lucide-react";
import {
  CatalogFilters,
  writeCatalogUrl,
} from "@/components/catalog/catalog-filters";
import { CatalogGrid } from "@/components/catalog/catalog-grid";
import { PrefetchLink } from "@/components/prefetch-link";
import { Button, buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { catalogQueryIsActive } from "@/lib/catalog";
import {
  browseCatalog,
  catalogBrowseSearchParams,
  catalogBrowseState,
  catalogFacetsActive,
  rememberCatalogBrowse,
  resolveCatalogBrowseSearch,
  type CatalogFacets,
} from "@/lib/catalog-browse";
import {
  EMPTY_CATALOG_FILTER_EXTRAS,
  type CatalogFilterExtras,
} from "@/lib/catalog-filter-options";
import { cn } from "@/lib/utils";
import type { Property } from "@/lib/types";

const CatalogSearchContext = createContext<Property[] | null>(null);

export function CatalogMatchCount() {
  const shown = useContext(CatalogSearchContext);
  return <>{shown?.length ?? 0} комплексов</>;
}

export function CatalogExplorer({
  properties,
  initialSearch = "",
  hideRelevance = false,
  canEdit = false,
  extras = EMPTY_CATALOG_FILTER_EXTRAS,
  canAddFilters = false,
  children,
}: {
  properties: Property[];
  initialSearch?: string;
  hideRelevance?: boolean;
  canEdit?: boolean;
  extras?: CatalogFilterExtras;
  canAddFilters?: boolean;
  children: React.ReactNode;
}) {
  const [pending, startTransition] = useTransition();
  const initial = catalogBrowseState(initialSearch, properties);
  const [query, setQuery] = useState(initial.query);
  const [facets, setFacets] = useState(initial.facets);
  const synced = useRef(
    catalogBrowseSearchParams(initial.facets, initial.query).toString(),
  );
  const propertiesRef = useRef(properties);
  propertiesRef.current = properties;
  const desired = catalogBrowseState(
    resolveCatalogBrowseSearch(initialSearch),
    properties,
  );
  const desiredKey = catalogBrowseSearchParams(desired.facets, desired.query).toString();
  if (synced.current !== desiredKey) {
    synced.current = desiredKey;
    setQuery(desired.query);
    setFacets(desired.facets);
  }

  useEffect(() => {
    const params = catalogBrowseSearchParams(facets, query);
    if (params.toString() !== synced.current) return;
    rememberCatalogBrowse(params.toString());
    writeCatalogUrl(params);
  }, [facets, query]);

  const onBrowseChange = useCallback(
    (next: { query: string; facets: CatalogFacets }) => {
      const state = catalogBrowseState(
        catalogBrowseSearchParams(next.facets, next.query).toString(),
        propertiesRef.current,
      );
      setQuery(next.query);
      setFacets(state.facets);
      const params = catalogBrowseSearchParams(state.facets, next.query);
      synced.current = params.toString();
      rememberCatalogBrowse(params.toString());
      writeCatalogUrl(params);
    },
    [setQuery, setFacets],
  );

  const shown = useMemo(
    () => browseCatalog(properties, facets, query),
    [properties, facets, query],
  );
  const trimmedQuery = query.trim();
  const searchMiss = catalogQueryIsActive(query) && shown.length === 0;

  return (
    <CatalogSearchContext.Provider value={shown}>
      {children}
      <CatalogFilters
        properties={properties}
        draft={facets}
        onBrowseChange={onBrowseChange}
        extras={extras}
        canAddFilters={canAddFilters}
        pending={pending}
        startTransition={startTransition}
        query={query}
      >
        <div className="relative min-h-40">
          {pending ? (
            <div className="absolute inset-0 z-20 flex animate-in fade-in items-start justify-center rounded-2xl bg-background/55 pt-20 backdrop-blur-[1px] duration-200 ease-luxury">
              <div className="inline-flex items-center gap-2 rounded-full border bg-background px-3 py-2 text-sm shadow-sm">
                <Loader2 className="h-4 w-4 animate-spin" />
                Применяем фильтры
              </div>
            </div>
          ) : null}
          <div
            className={cn(
              "transition-opacity duration-200 ease-luxury motion-reduce:transition-none",
              pending && "pointer-events-none opacity-50",
            )}
          >
            {shown.length > 0 ? (
              <CatalogGrid properties={shown} hideRelevance={hideRelevance} />
            ) : searchMiss ? (
              <EmptyState
                icon={<Building2 className="h-5 w-5" />}
                title={`Ничего не найдено по запросу «${trimmedQuery}»`}
                description={
                  catalogFacetsActive(facets)
                    ? "Выбранные фильтры останутся на месте."
                    : "Проверьте название, застройщика или район."
                }
                action={
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onBrowseChange({ query: "", facets })}
                  >
                    Сбросить поиск
                  </Button>
                }
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
                    <PrefetchLink
                      href="/properties/new"
                      className={buttonVariants()}
                    >
                      <Plus className="h-4 w-4" />
                      Добавить объект
                    </PrefetchLink>
                  ) : undefined
                }
              />
            )}
          </div>
        </div>
      </CatalogFilters>
    </CatalogSearchContext.Provider>
  );
}
