import type { Property, PropertyCatalog } from "@/lib/types";

export const PROPERTY_PUBLIC_COLUMNS =
  "id, title, property_type, listing_type, status, price, area, rooms, address, city, district, description, cover_url, developer, completion_year, installment_max, maternity_capital, has_large_apartments, relevance, catalog, assigned_to, created_by, created_at, updated_at";

export function emptyCatalog(): PropertyCatalog {
  return {};
}

export function getCatalog(
  property: Pick<Property, "catalog"> | null | undefined,
): PropertyCatalog {
  return property?.catalog ?? emptyCatalog();
}

export function hasCommercialCatalog(
  property: Pick<Property, "property_type" | "catalog">,
): boolean {
  if (property.property_type === "commercial") return true;
  return (property.catalog?.commercial ?? []).some(
    (group) =>
      group.items.length > 0 ||
      Boolean(group.note && group.note.trim() && group.note.trim() !== "Коммерция"),
  );
}

export function hasInstallmentCatalog(
  property: Pick<Property, "installment_max" | "catalog">,
): boolean {
  if (property.installment_max) return true;
  return (property.catalog?.installment?.length ?? 0) > 0;
}

const DOCUMENT_LABELS: Record<string, string> = {
  plan: "Планировки",
  price: "Прайс и условия",
  chess: "Шахматка",
  commercial: "Коммерция",
  map: "Карта",
  other: "Документ",
};

export function visibleDocuments(catalog: PropertyCatalog | null | undefined) {
  const mapUrl = catalog?.location?.map_url;
  return (catalog?.documents ?? [])
    .filter((doc) => doc.kind !== "map" && doc.url !== mapUrl)
    .map((doc) => ({
      ...doc,
      title: doc.title.startsWith("http")
        ? DOCUMENT_LABELS[doc.kind] ?? DOCUMENT_LABELS.other
        : doc.title.replace(/\s+https?:\/\/\S+/g, "").trim() ||
          DOCUMENT_LABELS[doc.kind],
    }));
}

export function catalogLocationLabel(
  property: Pick<Property, "city" | "district" | "address" | "catalog">,
): string {
  const fromCatalog = property.catalog?.location?.address
    ?.replace(/\s+[—-]\s*2ГИС$/i, "")
    .trim();
  if (fromCatalog && !/^https?:\/\//i.test(fromCatalog)) return fromCatalog;
  return [property.city, property.district]
    .filter(Boolean)
    .filter((value, index, all) => all.indexOf(value) === index)
    .join(", ");
}
