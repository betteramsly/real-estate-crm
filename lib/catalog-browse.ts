import {
  catalogQueryIsActive,
  catalogTitleLeadsSearch,
  hasCommercialCatalog,
  matchesCatalogSearch,
} from "@/lib/catalog";
import type { Property } from "@/lib/types";

export type CatalogFacets = {
  city: string[];
  district: string[];
  developer: string[];
  completion_year: string[];
  installment: string[];
  relevance: string[];
  maternity: boolean;
  cash: boolean;
  commercial: boolean;
  large: boolean;
};

export const EMPTY_CATALOG_FACETS: CatalogFacets = {
  city: [],
  district: [],
  developer: [],
  completion_year: [],
  installment: [],
  relevance: [],
  maternity: false,
  cash: false,
  commercial: false,
  large: false,
};

const LIST_KEYS = [
  "city",
  "district",
  "developer",
  "completion_year",
  "installment",
  "relevance",
] as const;

const FLAG_KEYS = ["maternity", "cash", "commercial", "large"] as const;

const SEARCH_KEYS = ["q", ...LIST_KEYS, ...FLAG_KEYS] as const;

export type CatalogBrowseProperty = Pick<
  Property,
  | "title"
  | "developer"
  | "city"
  | "district"
  | "address"
  | "completion_year"
  | "catalog"
  | "installment_max"
  | "maternity_capital"
  | "cash_payment"
  | "has_large_apartments"
  | "relevance"
  | "property_type"
>;

function listFrom(params: URLSearchParams, key: string) {
  return (params.get(key) ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function uniqueSorted(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value)))).sort(
    (left, right) => left.localeCompare(right, "ru"),
  );
}

export function facetsFromSearchParams(params: URLSearchParams): CatalogFacets {
  return {
    city: listFrom(params, "city"),
    district: listFrom(params, "district"),
    developer: listFrom(params, "developer"),
    completion_year: listFrom(params, "completion_year"),
    installment: listFrom(params, "installment"),
    relevance: listFrom(params, "relevance").filter(
      (value) => value === "1" || value === "2" || value === "3",
    ),
    maternity: params.get("maternity") === "1",
    cash: params.get("cash") === "1",
    commercial: params.get("commercial") === "1",
    large: params.get("large") === "1",
  };
}

export function catalogBrowseSearchParams(facets: CatalogFacets, query: string) {
  const params = new URLSearchParams();
  const text = query.trim();
  if (text) params.set("q", text);
  for (const key of LIST_KEYS) {
    if (facets[key].length) params.set(key, facets[key].join(","));
  }
  for (const key of FLAG_KEYS) {
    if (facets[key]) params.set(key, "1");
  }
  return params;
}

const CATALOG_BROWSE_KEY = "catalog-browse";
let catalogBrowseMemory: { known: true; search: string } | { known: false } = {
  known: false,
};
let catalogBrowseReady = false;

function loadCatalogBrowseMemory() {
  if (catalogBrowseMemory.known || typeof window === "undefined") {
    return catalogBrowseMemory;
  }
  try {
    const stored = sessionStorage.getItem(CATALOG_BROWSE_KEY);
    catalogBrowseMemory =
      stored === null ? { known: false } : { known: true, search: stored };
  } catch {
    catalogBrowseMemory = { known: false };
  }
  return catalogBrowseMemory;
}

export function catalogBrowseSearchFromSources(
  initialSearch: string,
  remembered = "",
) {
  return initialSearch || remembered;
}

export function readCatalogBrowse() {
  const memory = loadCatalogBrowseMemory();
  return memory.known ? memory.search : "";
}

export function rememberCatalogBrowse(search: string) {
  if (typeof window === "undefined") return;
  catalogBrowseMemory = { known: true, search };
  try {
    sessionStorage.setItem(CATALOG_BROWSE_KEY, search);
  } catch {
    // Private mode can reject storage; the in-memory copy still covers this tab.
  }
}

export function resolveCatalogBrowseSearch(initialSearch: string) {
  if (typeof window === "undefined") return initialSearch;
  const live =
    window.location.pathname === "/properties"
      ? window.location.search.replace(/^\?/, "")
      : "";
  const memory = loadCatalogBrowseMemory();
  if (!catalogBrowseReady) {
    catalogBrowseReady = true;
    if (live) return live;
    if (memory.known) return memory.search;
    return initialSearch;
  }
  if (memory.known) return memory.search;
  if (live) return live;
  return initialSearch;
}

export function catalogInitialSearch(
  params: Partial<Record<(typeof SEARCH_KEYS)[number], string | string[] | undefined>>,
) {
  const search = new URLSearchParams();
  for (const key of SEARCH_KEYS) {
    const value = params[key];
    const text = Array.isArray(value) ? value.filter(Boolean).join(",") : value;
    if (text) search.set(key, text);
  }
  return search.toString();
}

export function districtsForCities(
  properties: ReadonlyArray<Pick<Property, "city" | "district">>,
  cities: readonly string[],
) {
  const selected = new Set(cities);
  const values: string[] = [];
  for (const property of properties) {
    if (!property.district) continue;
    if (selected.size > 0 && !selected.has(property.city ?? "")) continue;
    values.push(property.district);
  }
  return uniqueSorted(values);
}

export function retainCatalogDistricts(
  districts: readonly string[],
  cities: readonly string[],
  properties: ReadonlyArray<Pick<Property, "city" | "district">>,
) {
  if (!cities.length) return districts as string[];
  const allowed = new Set(districtsForCities(properties, cities));
  const next = districts.filter((district) => allowed.has(district));
  if (next.length === districts.length) return districts as string[];
  return next;
}

export function catalogBrowseState(
  search: string,
  properties: ReadonlyArray<Pick<Property, "city" | "district">>,
) {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  const query = params.get("q") ?? "";
  const parsed = facetsFromSearchParams(params);
  const district = retainCatalogDistricts(parsed.district, parsed.city, properties);
  return {
    query,
    facets: district === parsed.district ? parsed : { ...parsed, district },
  };
}

export function catalogFacetsActive(facets: CatalogFacets) {
  return (
    LIST_KEYS.some((key) => facets[key].length > 0) ||
    FLAG_KEYS.some((key) => facets[key])
  );
}

function matchesInstallment(value: string | null | undefined, selected: string[]) {
  if (!selected.length) return true;
  const terms = selected.filter((item) => item !== "1");
  if (terms.length) return terms.includes(value ?? "");
  return selected.includes("1") ? Boolean(value) : true;
}

function matchesSelected(selected: string[], value: string | null | undefined) {
  return !selected.length || selected.includes(value ?? "");
}

export function matchesCatalogFacets(
  property: CatalogBrowseProperty,
  facets: CatalogFacets,
) {
  if (!matchesSelected(facets.city, property.city)) return false;
  if (!matchesSelected(facets.district, property.district)) return false;
  if (!matchesSelected(facets.developer, property.developer)) return false;
  if (!matchesSelected(facets.completion_year, property.completion_year)) return false;
  if (!matchesInstallment(property.installment_max, facets.installment)) return false;
  if (facets.relevance.length) {
    if (
      property.relevance == null ||
      !facets.relevance.includes(String(property.relevance))
    ) {
      return false;
    }
  }
  if (facets.maternity && !property.maternity_capital) return false;
  if (facets.cash && !property.cash_payment) return false;
  if (facets.large && !property.has_large_apartments) return false;
  if (facets.commercial && !hasCommercialCatalog(property)) return false;
  return true;
}

export function browseCatalog<T extends CatalogBrowseProperty>(
  properties: readonly T[],
  facets: CatalogFacets,
  query: string,
): T[] {
  const faceted = properties.filter((property) => matchesCatalogFacets(property, facets));
  if (!catalogQueryIsActive(query)) return faceted;
  const matched = faceted.filter((property) => matchesCatalogSearch(property, query));
  return matched
    .map((property, index) => ({
      property,
      index,
      lead: catalogTitleLeadsSearch(property.title, query) ? 1 : 0,
    }))
    .sort((left, right) => right.lead - left.lead || left.index - right.index)
    .map((item) => item.property);
}
