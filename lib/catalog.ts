import { isHttpUrl } from "@/lib/linkify";
import type {
  CatalogFact,
  CatalogTermGroup,
  Property,
  PropertyCatalog,
} from "@/lib/types";

export const PROPERTY_PUBLIC_COLUMNS =
  "id, title, property_type, listing_type, status, price, area, rooms, address, city, district, description, cover_url, developer, completion_year, installment_max, maternity_capital, cash_payment, has_large_apartments, relevance, catalog, assigned_to, created_by, created_at, updated_at";

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

export function sortInstallmentTerms(values: string[]) {
  return [...values].sort((left, right) => {
    const leftYears = Number(left.match(/\d+/)?.[0] ?? 0);
    const rightYears = Number(right.match(/\d+/)?.[0] ?? 0);
    return leftYears - rightYears || left.localeCompare(right, "ru");
  });
}

export function installmentFilterLabel(value: string) {
  const years = Number(value.match(/\d+/)?.[0] ?? 0);
  if (!years) return value;
  if (years === 1) return "до 1 года";
  return `до ${years} лет`;
}

const DOCUMENT_LABELS: Record<string, string> = {
  plan: "Планировки",
  price: "Прайс и условия",
  chess: "Шахматка",
  commercial: "Коммерция",
  map: "Карта",
  other: "Документ",
};

function normText(value: string) {
  return value.toLowerCase().replace(/\s+/g, " ").trim();
}

function foldSearchText(value: string) {
  return value.toLowerCase().replace(/ё/g, "е").trim();
}

function searchWords(value: string) {
  return foldSearchText(value)
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);
}

export function matchesCatalogSearch(
  property: Pick<
    Property,
    | "title"
    | "developer"
    | "city"
    | "district"
    | "address"
    | "completion_year"
    | "catalog"
  >,
  query: string,
) {
  const tokens = searchWords(query);
  if (!tokens.length) return true;
  const words = [
    property.title,
    property.developer,
    property.city,
    property.district,
    catalogLocationLabel(property),
    property.completion_year,
  ].flatMap((value) => searchWords(value ?? ""));
  return tokens.every((token) =>
    words.some(
      (word) =>
        word === token || (token.length >= 2 && word.startsWith(token)),
    ),
  );
}

export function looksLikeUrl(value: string) {
  const text = value.trim();
  return (
    /^https?:\/\//i.test(text) ||
    /^www\./i.test(text) ||
    /^(yandex\.ru|2gis\.ru|go\.2gis\.com|maps\.google)/i.test(text)
  );
}

function documentTitle(title: string, kind: string, url: string) {
  const cleaned = title.replace(/\s+https?:\/\/\S+/g, "").trim();
  const blob = `${cleaned} ${url}`.toLowerCase();
  if (/коммерц/.test(blob)) return DOCUMENT_LABELS.commercial;
  if (/шахмат|\.xlsx|\.xls/.test(blob)) return DOCUMENT_LABELS.chess;
  if (/планир/.test(blob)) return DOCUMENT_LABELS.plan;
  if (
    !cleaned ||
    /^https?:\/\//i.test(cleaned) ||
    /yandex finds|на карте|everything/i.test(cleaned)
  ) {
    return DOCUMENT_LABELS[kind] ?? DOCUMENT_LABELS.other;
  }
  return cleaned;
}

export function isPresentCatalogDocument(doc: {
  title: string;
  url: string;
  kind?: string;
}) {
  const blob = `${doc.title} ${doc.url}`.toLowerCase();
  return doc.kind === "plan" || /планир/.test(blob);
}

export function inferCatalogDocumentKind(name: string) {
  const blob = name.toLowerCase();
  if (/коммерц/.test(blob)) return "commercial" as const;
  if (/шахмат|\.xlsx|\.xls/.test(blob)) return "chess" as const;
  if (/прайс|price/.test(blob)) return "price" as const;
  if (/планир|\.pdf/.test(blob)) return "plan" as const;
  return "other" as const;
}

export function catalogDocumentLabel(
  kind: string,
  fallback = DOCUMENT_LABELS.other,
) {
  return DOCUMENT_LABELS[kind] ?? fallback;
}

export function isClientExternalUrl(url: string, title = "") {
  const blob = `${title} ${url}`.toLowerCase();
  if (/коммерц/.test(blob)) return false;
  if (/шахмат|\.xlsx|\.xls/.test(blob)) return false;
  if (/планир/.test(blob)) return true;
  return /(?:^|[/.])2gis\.|go\.2gis\.com|maps\.yandex|yandex\.[^\s/]+\/maps|maps\.google|google\.[^\s/]+\/maps/i.test(
    url,
  );
}

export function visibleDocuments(
  catalog: PropertyCatalog | null | undefined,
  options?: { client?: boolean },
) {
  const mapUrl = catalog?.location?.map_url;
  const seen = new Set<string>();
  return (catalog?.documents ?? [])
    .filter((doc) => doc.kind !== "map" && doc.url !== mapUrl)
    .map((doc) => ({
      ...doc,
      title: documentTitle(doc.title, doc.kind, doc.url),
    }))
    .filter((doc) => {
      const key = `${doc.title}:${doc.url}`;
      if (seen.has(key) || seen.has(doc.url)) return false;
      seen.add(key);
      seen.add(doc.url);
      return true;
    })
    .filter((doc) =>
      options?.client ? isPresentCatalogDocument(doc) : true,
    );
}

export const CATALOG_MATERIAL_ITEMS = [
  { id: "price", present: "Прайс", missing: "Нет прайса" },
  { id: "chess", present: "Шахматка", missing: "Нет шахматки" },
  { id: "map", present: "Карта", missing: "Нет карты" },
] as const;

export type CatalogMaterialId = (typeof CATALOG_MATERIAL_ITEMS)[number]["id"];

export function catalogMaterialStatus(
  property: Pick<Property, "catalog">,
): Record<CatalogMaterialId, boolean> {
  const catalog = getCatalog(property);
  const docs = visibleDocuments(catalog);
  const rawAddress = catalog.location?.address?.trim() ?? "";
  return {
    price:
      catalogPricePhotos(property).length > 0 ||
      docs.some(
        (doc) =>
          doc.kind === "price" || /прайс|price/i.test(`${doc.title} ${doc.url}`),
      ),
    chess: docs.some((doc) => /шахмат/i.test(doc.title)),
    map: Boolean(catalog.location?.map_url) || looksLikeUrl(rawAddress),
  };
}

function yearKey(label: string) {
  return label.match(/\d+/)?.[0] ?? normText(label);
}

function uniqueLines(...chunks: Array<string | undefined>) {
  const seen = new Set<string>();
  const lines: string[] = [];
  for (const chunk of chunks) {
    for (const line of (chunk ?? "").split(/\n+/)) {
      const trimmed = line.replace(/^[-•✔️🧱\s]+/, "").trim();
      const key = normText(trimmed);
      if (!trimmed || seen.has(key)) continue;
      seen.add(key);
      lines.push(trimmed);
    }
  }
  return lines;
}

export function compactTermGroups(
  groups: CatalogTermGroup[] | undefined,
): CatalogTermGroup[] {
  const merged: CatalogTermGroup[] = [];
  for (const group of groups ?? []) {
    if (!group.items.length && !group.note) continue;
    const keys = new Set(group.items.map((item) => yearKey(item.label)));
    const existing = merged.find((candidate) => {
      if (!candidate.items.length || !group.items.length) return false;
      const other = new Set(candidate.items.map((item) => yearKey(item.label)));
      const overlap = [...keys].filter((key) => other.has(key)).length;
      return overlap >= Math.min(keys.size, other.size) * 0.6;
    });
    if (!existing) {
      merged.push({
        title: group.title,
        items: [...group.items],
        note: group.note,
      });
      continue;
    }
    for (const item of group.items) {
      if (existing.items.some((row) => yearKey(row.label) === yearKey(item.label))) {
        continue;
      }
      existing.items.push(item);
    }
    const notes = uniqueLines(existing.note, group.note);
    existing.note = notes.length ? notes.join("\n") : undefined;
    if (group.title.length < existing.title.length) existing.title = group.title;
  }
  return merged.map((group) => ({
    ...group,
    note:
      uniqueLines(group.note)
        .filter((line) => !/^\d+/.test(line) || !/(год|года|лет)/i.test(line))
        .filter((line) => !/сдача дома|^рассрочка на /i.test(line))
        .join("\n") || undefined,
  }));
}

export function compactAbout(
  about: string | null | undefined,
  used: Array<string | null | undefined>,
) {
  const usedNorm = used.map((value) => (value ? normText(value) : "")).filter(Boolean);
  return uniqueLines(about ?? undefined)
    .filter((line) => {
      const key = normText(line);
      if (/^информаци/.test(key)) return false;
      if (/(перерасчет|сдача дома|мат капитал принимаем|рассрочка на \d)/i.test(key)) {
        return false;
      }
      return !usedNorm.some(
        (value) =>
          value.length > 2 &&
          (key.includes(value) || value.includes(key)) &&
          Math.min(key.length, value.length) < 80,
      );
    })
    .join("\n");
}

export function compactFacts(
  facts: CatalogFact[] | undefined,
  used: Array<string | null | undefined>,
) {
  const usedNorm = used.map((value) => (value ? normText(value) : "")).filter(Boolean);
  return (facts ?? []).filter((fact) => {
    const value = normText(fact.value);
    if (!value) return false;
    return !usedNorm.some(
      (usedValue) =>
        usedValue.length > 2 &&
        (value.includes(usedValue) || usedValue.includes(value)),
    );
  });
}

export function catalogLocationLabel(
  property: Pick<Property, "city" | "district" | "address" | "catalog">,
): string {
  const fromCatalog = property.catalog?.location?.address
    ?.replace(/\s+[—-]\s*2ГИС$/i, "")
    .trim();
  if (fromCatalog && !looksLikeUrl(fromCatalog)) return fromCatalog;
  return [property.city, property.district]
    .filter(Boolean)
    .filter((value, index, all) => all.indexOf(value) === index)
    .join(", ");
}

const QUARTER_LABELS: Record<number, string> = {
  1: "I кв.",
  2: "II кв.",
  3: "III кв.",
  4: "IV кв.",
};

export function completionQuarterLabel(
  quarter: number | null | undefined,
): string | null {
  if (!quarter || quarter < 1 || quarter > 4) return null;
  return QUARTER_LABELS[quarter];
}

export function completionLabel(
  property: Pick<Property, "completion_year" | "rooms">,
): string | null {
  const quarter = completionQuarterLabel(property.rooms);
  const year = property.completion_year?.trim() || null;
  if (year && quarter) {
    return /^\d{4}$/.test(year) ? `сдача ${quarter} ${year}` : `${year} · ${quarter}`;
  }
  if (year) return /^сдача\b/i.test(year) ? year : `сдача ${year}`;
  if (quarter) return `сдача ${quarter}`;
  return null;
}

export function catalogPricePhotos(
  property: Pick<Property, "catalog">,
): string[] {
  const raw = property.catalog?.price_photos ?? [];
  const inFolder = raw.filter((url) => /\/price\//.test(url));
  const source = inFolder.length ? inFolder : raw;
  const seen = new Set<string>();
  const urls: string[] = [];
  for (const url of source) {
    if (!url) continue;
    const name = url.split("/").pop() ?? url;
    if (seen.has(url) || seen.has(name)) continue;
    seen.add(url);
    seen.add(name);
    urls.push(url);
  }
  return urls;
}

export function catalogPhotos(
  property: Pick<Property, "cover_url" | "catalog">,
): string[] {
  const prices = new Set(catalogPricePhotos(property));
  const locations = new Set(catalogLocationPhotos(property));
  const seen = new Set<string>();
  const urls: string[] = [];
  const candidates = [property.cover_url, ...(property.catalog?.photos ?? [])];
  const gallery = candidates.filter((url) => url && /\/gallery\//.test(url));
  const coverStem = property.cover_url?.replace(
    /\.(?:webp|jpe?g|png)(?:\?.*)?$/i,
    "",
  );
  const coverIsGalleryPlaceholder = Boolean(
    coverStem &&
      gallery.some((url) => url?.startsWith(`${coverStem}/gallery/`)),
  );
  const rest = candidates.filter(
    (url) =>
      url &&
      !/\/gallery\//.test(url) &&
      !(url === property.cover_url && coverIsGalleryPlaceholder) &&
      !/\/complexes\/[0-9a-f-]{36}\.(webp|jpe?g|png)$/i.test(url),
  );
  for (const url of gallery.length ? [...gallery, ...rest] : candidates) {
    if (!url || seen.has(url) || prices.has(url) || locations.has(url)) continue;
    seen.add(url);
    urls.push(url);
  }
  return urls;
}

export const CATALOG_PAGE_SIZE = 30;

export function slimCatalogCard(property: Property): Property {
  const photos = catalogPhotos(property);
  return {
    ...property,
    description: null,
    catalog: {
      photos: photos.slice(0, 1),
      location: property.catalog?.location?.address
        ? { address: property.catalog.location.address }
        : undefined,
      commercial: property.catalog?.commercial,
      installment: property.catalog?.installment,
    },
  };
}

export function catalogLocationPhotos(
  property: Pick<Property, "catalog">,
): string[] {
  const seen = new Set<string>();
  const urls: string[] = [];
  for (const url of property.catalog?.location?.photos ?? []) {
    if (
      !url ||
      seen.has(url) ||
      /favicon/i.test(url) ||
      /share\.api\.2gis\.ru\/getimage/i.test(url)
    ) {
      continue;
    }
    seen.add(url);
    urls.push(url);
  }
  return urls;
}

function polishAboutLine(line: string) {
  let text = line.replace(/\s+/g, " ").trim();
  if (isHttpUrl(text)) return text;
  text = text.replace(
    /^(этажность|фасад|класс|корпуса|корпусов|высота)\s+/i,
    (match, key: string) =>
      `${key.charAt(0).toUpperCase()}${key.slice(1).toLowerCase()}: `,
  );
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function formatAboutBlocks(about: string) {
  const lines: string[] = [];
  for (const line of uniqueLines(about)) {
    if (lines.length && /^\([^)]*\)\.?$/.test(line)) {
      lines[lines.length - 1] = `${lines[lines.length - 1]} ${line}`;
      continue;
    }
    lines.push(polishAboutLine(line));
  }
  const blocks: Array<{ type: "p" | "list"; items: string[] }> = [];
  let buffer: string[] = [];
  let mode: "p" | "list" | null = null;

  const flush = () => {
    if (!buffer.length || !mode) return;
    blocks.push({ type: mode, items: buffer });
    buffer = [];
    mode = null;
  };

  for (const line of lines) {
    const next = line.length < 92 && !/[.!?]$/.test(line) ? "list" : "p";
    if (mode && mode !== next) flush();
    mode = next;
    buffer.push(line);
  }
  flush();
  return blocks;
}
