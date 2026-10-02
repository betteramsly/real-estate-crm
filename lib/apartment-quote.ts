import type {
  ApartmentCalculation,
  ApartmentQuote,
  CatalogTermGroup,
  QuoteDiscount,
  QuoteDiscountMode,
} from "@/lib/types";

export const QUOTE_MAX = 12;
export const FLOOR_PLAN_BUCKET = "floor-plans";
export const FLOOR_PLAN_SOURCE_MAX_BYTES = 3_500_000;
export const FLOOR_PLAN_STORED_MAX_BYTES = 2_500_000;
export const FLOOR_PLAN_MAX_EDGE = 2400;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const CALCULATION_COLUMNS =
  "id, created_by, property_id, property_title, area, price_m2, price, price_after_discount, discounts, developer_promo, markup_pct, markup, months, term_label, down_m2, down_lump, down_payment, remaining, total, monthly, floor_plan_url, created_at, updated_at";

export const DISCOUNT_MAX = 2;

export type QuoteDiscountInput = {
  label: string;
  mode: QuoteDiscountMode;
  value: number;
};

export type QuoteInput = {
  area: number | null;
  priceM2: number | null;
  price: number | null;
  markupPct: number;
  months: number;
  downM2: number;
  downLump: number;
  discounts?: QuoteDiscountInput[];
  developerPromo?: string | null;
};

export type QuoteMath = {
  area: number | null;
  priceM2: number | null;
  price: number;
  priceAfterDiscount: number;
  discounts: QuoteDiscount[];
  discountTotal: number;
  discountCapped: boolean;
  developerPromo: string | null;
  markupPct: number;
  markup: string;
  months: number;
  termLabel: string;
  downM2: number;
  downLump: number;
  downPayment: number;
  remaining: number;
  total: number;
  monthly: number;
  downClamped: boolean;
};

export type InstallmentTermOption = {
  id: string;
  label: string;
  months: number;
  markupPct: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function roundMoney(value: number) {
  return Math.round(value);
}

export function formatMarkup(pct: number) {
  if (!Number.isFinite(pct) || pct <= 0) return "без наценки";
  const rounded = Math.round(pct * 100) / 100;
  const text = Number.isInteger(rounded)
    ? String(rounded)
    : String(rounded).replace(".", ",");
  return `${text}%`;
}

export function discountCaption(discount: QuoteDiscount) {
  const name = discount.label.trim();
  const title = !name || /^скидк/i.test(name) ? name || "Скидка" : `Скидка ${name}`;
  if (discount.mode !== "percent") return title;
  return `${title} ${formatMarkup(discount.value)}`;
}

export function formatTermMonths(months: number) {
  if (!Number.isFinite(months) || months <= 0) return "Сразу";
  const whole = Math.round(months);
  if (whole % 12 === 0) {
    const years = whole / 12;
    const mod10 = years % 10;
    const mod100 = years % 100;
    const word =
      mod10 === 1 && mod100 !== 11
        ? "год"
        : mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)
          ? "года"
          : "лет";
    return `${years} ${word}`;
  }
  return `${whole} мес.`;
}

export function formatArea(value: number | null | undefined) {
  if (value === null || value === undefined || !Number.isFinite(value) || value <= 0) {
    return "—";
  }
  const text = new Intl.NumberFormat("ru-RU", {
    maximumFractionDigits: 2,
  }).format(value);
  return `${text} м²`;
}

export function parseDecimal(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : null;
  }
  if (typeof value !== "string") return null;
  const normalized = value.replace(/\s/g, "").replace(",", ".");
  if (!normalized || normalized === ".") return null;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

export function parseAmount(value: string): number | null {
  const digits = value.replace(/[^\d]/g, "");
  if (!digits) return null;
  const parsed = Number(digits);
  return Number.isFinite(parsed) ? parsed : null;
}

export function parseMarkupPercent(value: string): number | null {
  const text = value.trim().toLowerCase();
  if (!text) return null;
  if (/без наценки|без удорожания/.test(text)) return 0;
  const match = text.match(/(\d+(?:[.,]\d+)?)\s*%/);
  if (!match?.[1]) return null;
  const parsed = Number(match[1].replace(",", "."));
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 200) return null;
  return parsed;
}

export function parseTermMonths(value: string): number | null {
  const year = value.match(/(\d+(?:[.,]\d+)?)\s*(?:года|год|лет|г\.)/i);
  if (year?.[1]) {
    const parsed = Number(year[1].replace(",", "."));
    if (parsed > 0 && parsed <= 30) return Math.round(parsed * 12);
  }
  const month = value.match(/(\d+)\s*мес/i);
  if (month?.[1]) {
    const parsed = Number(month[1]);
    if (parsed > 0 && parsed <= 360) return parsed;
  }
  return null;
}

export function parseInstallmentTerms(
  groups: CatalogTermGroup[] | undefined,
): InstallmentTermOption[] {
  const terms: InstallmentTermOption[] = [];
  const seen = new Set<string>();
  for (const group of groups ?? []) {
    for (const item of group.items) {
      const markupPct = parseMarkupPercent(item.value);
      const months =
        parseTermMonths(item.label) ?? parseTermMonths(item.value);
      if (markupPct === null || months === null || months <= 0) continue;
      const key = `${months}:${markupPct}`;
      if (seen.has(key)) continue;
      seen.add(key);
      terms.push({
        id: key,
        label: item.label.trim() || formatTermMonths(months),
        months,
        markupPct,
      });
    }
  }
  return terms.sort(
    (a, b) => a.months - b.months || a.markupPct - b.markupPct,
  );
}

export function defaultInstallmentTerm(
  terms: InstallmentTermOption[],
  installmentMax?: string | null,
) {
  if (!terms.length) return null;
  const maxMonths = installmentMax ? parseTermMonths(installmentMax) : null;
  if (maxMonths) {
    const match = terms.find((term) => term.months === maxMonths);
    if (match) return match;
  }
  return terms.reduce((best, term) =>
    term.months > best.months ? term : best,
  );
}

export function suggestDownPayment(note: string | null | undefined): {
  downM2: number;
  downLump: number;
} {
  if (!note) return { downM2: 0, downLump: 0 };
  const perMeter = note.match(
    /(\d[\d\s]{0,10})\s*(?:₽|руб\.?|р\.?)?\s*(?:\/|на)\s*м/i,
  );
  if (perMeter?.[1]) {
    const amount = parseAmount(perMeter[1]);
    if (amount !== null && amount > 0 && amount <= 500_000) {
      return { downM2: amount, downLump: 0 };
    }
  }
  if (!/плат[её]ж|взнос|перв/i.test(note)) {
    return { downM2: 0, downLump: 0 };
  }
  const amounts = [...note.matchAll(/(\d[\d\s]{2,12})/g)]
    .map((match) => (match[1] ? parseAmount(match[1]) : null))
    .filter((amount): amount is number => amount !== null && amount >= 1000);
  const perSquare = amounts.filter((amount) => amount <= 20_000);
  if (perSquare.length === 1) return { downM2: perSquare[0] ?? 0, downLump: 0 };
  return { downM2: 0, downLump: 0 };
}

export function installmentNotes(groups: CatalogTermGroup[] | undefined) {
  return (groups ?? [])
    .map((group) => group.note?.trim())
    .filter((note): note is string => Boolean(note))
    .join("\n");
}

export function normalizeDeveloperPromo(value: string | null | undefined) {
  const text = (value ?? "").replace(/\s+/g, " ").trim().slice(0, 240);
  return text || null;
}

export function applyQuoteDiscounts(
  listPrice: number,
  payable: number,
  inputs: QuoteDiscountInput[] | undefined,
): { discounts: QuoteDiscount[]; discountTotal: number; capped: boolean } {
  const discounts: QuoteDiscount[] = [];
  let spent = 0;
  let capped = false;
  const pending = (inputs ?? []).slice(0, DISCOUNT_MAX);
  for (let index = 0; index < pending.length; index += 1) {
    const raw = pending[index];
    if (!raw) continue;
    const room = payable - spent - 1;
    const rawValue = Number.isFinite(raw.value) ? raw.value : 0;
    if (rawValue <= 0) continue;
    if (room <= 0) {
      capped = true;
      break;
    }
    const mode: QuoteDiscountMode = raw.mode === "percent" ? "percent" : "amount";
    const value =
      mode === "percent"
        ? Math.round(clamp(rawValue, 0, 90) * 100) / 100
        : roundMoney(clamp(rawValue, 0, payable));
    if (value <= 0) continue;
    const requested =
      mode === "percent" ? roundMoney((listPrice * value) / 100) : value;
    const amount = Math.min(requested, room);
    if (amount <= 0) continue;
    if (amount < requested) capped = true;
    spent += amount;
    const label = raw.label.replace(/\s+/g, " ").trim().slice(0, 40) || "Скидка";
    discounts.push({ label, mode, value, amount });
  }
  return { discounts, discountTotal: spent, capped };
}

export function parseDiscountInputs(value: unknown): QuoteDiscountInput[] {
  if (!Array.isArray(value)) return [];
  const inputs: QuoteDiscountInput[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const row = item as Record<string, unknown>;
    const numeric = readNumber(row.value);
    if (numeric === null || numeric <= 0) continue;
    inputs.push({
      label: typeof row.label === "string" ? row.label : "",
      mode: row.mode === "percent" ? "percent" : "amount",
      value: numeric,
    });
    if (inputs.length >= DISCOUNT_MAX) break;
  }
  return inputs;
}

export function calculateApartmentQuote(input: QuoteInput): QuoteMath | null {
  const area =
    input.area !== null && input.area > 0 && input.area <= 500
      ? input.area
      : null;
  const priceM2 =
    input.priceM2 !== null && input.priceM2 > 0 && input.priceM2 <= 50_000_000
      ? input.priceM2
      : null;
  let price =
    input.price !== null && input.price > 0 ? roundMoney(input.price) : 0;
  if (!price && area && priceM2) price = roundMoney(area * priceM2);
  if (!price || price > 5_000_000_000) return null;

  const markupPct = clamp(
    Number.isFinite(input.markupPct) ? input.markupPct : 0,
    0,
    200,
  );
  const months = Math.round(
    clamp(Number.isFinite(input.months) ? input.months : 0, 0, 360),
  );
  const downM2 = clamp(Number.isFinite(input.downM2) ? input.downM2 : 0, 0, 50_000_000);
  const downLump = clamp(
    Number.isFinite(input.downLump) ? input.downLump : 0,
    0,
    5_000_000_000,
  );
  const rawDown = roundMoney((area ? area * downM2 : 0) + downLump);
  const downPayment = Math.min(price, Math.max(0, rawDown));
  const principal = price - downPayment;
  const remaining =
    months > 0 ? roundMoney(principal * (1 + markupPct / 100)) : 0;
  const payable = months > 0 ? remaining : price;
  const { discounts, discountTotal, capped } = applyQuoteDiscounts(
    price,
    payable,
    input.discounts,
  );
  const afterDiscount = payable - discountTotal;
  const total = months > 0 ? downPayment + afterDiscount : afterDiscount;
  const monthly = months > 0 ? roundMoney(afterDiscount / months) : 0;

  return {
    area,
    priceM2,
    price,
    priceAfterDiscount: price,
    discounts,
    discountTotal,
    discountCapped: capped,
    developerPromo: normalizeDeveloperPromo(input.developerPromo),
    markupPct,
    markup: formatMarkup(markupPct),
    months,
    termLabel: formatTermMonths(months),
    downM2,
    downLump,
    downPayment,
    remaining,
    total,
    monthly,
    downClamped: rawDown > price,
  };
}

function readNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

function readText(value: unknown, max: number) {
  if (typeof value !== "string") return null;
  const text = value.trim();
  if (!text) return null;
  return text.slice(0, max);
}

function readUuid(value: unknown) {
  return typeof value === "string" && UUID_RE.test(value) ? value : null;
}

export function isFloorPlanUrl(value: string) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return false;
    if (url.username || url.password) return false;
    return /^\/storage\/v1\/object\/public\/floor-plans\/[A-Za-z0-9._/-]+\.(webp|jpe?g|png)$/i.test(
      url.pathname,
    );
  } catch {
    return false;
  }
}

export function floorPlanStoragePath(url: string | null, userId: string) {
  if (!url || !isFloorPlanUrl(url)) return null;
  try {
    const marker = `/storage/v1/object/public/${FLOOR_PLAN_BUCKET}/`;
    const pathname = new URL(url).pathname;
    const index = pathname.indexOf(marker);
    if (index < 0) return null;
    const path = decodeURIComponent(pathname.slice(index + marker.length));
    return path.startsWith(`${userId}/`) ? path : null;
  } catch {
    return null;
  }
}

export function parseShareQuote(value: unknown): ApartmentQuote | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  const price = readNumber(row.price);
  if (price === null || price <= 0 || price > 5_000_000_000) return null;

  const markupFromPct = readNumber(row.markup_pct);
  const markupFromText = parseMarkupPercent(
    typeof row.markup === "string" ? row.markup : "",
  );
  const markupPct = clamp(markupFromPct ?? markupFromText ?? 0, 0, 200);
  const monthsValue = readNumber(row.months);
  const months = Math.round(clamp(monthsValue ?? 0, 0, 360));
  const areaValue = readNumber(row.area);
  const area =
    areaValue !== null && areaValue > 0 && areaValue <= 500 ? areaValue : null;
  const priceM2Value = readNumber(row.price_m2);
  const priceM2 =
    priceM2Value !== null && priceM2Value >= 0 && priceM2Value <= 50_000_000
      ? priceM2Value
      : null;
  const downM2 = clamp(readNumber(row.down_m2) ?? 0, 0, 50_000_000);
  const downLump = clamp(readNumber(row.down_lump) ?? 0, 0, 5_000_000_000);
  const downPayment = clamp(readNumber(row.down_payment) ?? 0, 0, 5_000_000_000);
  const remaining = clamp(readNumber(row.remaining) ?? 0, 0, 10_000_000_000);
  const totalValue = readNumber(row.total);
  const total = clamp(
    totalValue !== null && totalValue >= 0 ? totalValue : price,
    0,
    10_000_000_000,
  );
  const monthly = clamp(readNumber(row.monthly) ?? 0, 0, 10_000_000_000);
  const floorPlan =
    typeof row.floor_plan_url === "string" && isFloorPlanUrl(row.floor_plan_url)
      ? row.floor_plan_url
      : null;
  const priceAfterValue = readNumber(row.price_after_discount);
  const priceAfterDiscount = clamp(
    priceAfterValue !== null && priceAfterValue > 0 ? priceAfterValue : price,
    1,
    price,
  );

  return {
    id: readUuid(row.id),
    calculation_id: readUuid(row.calculation_id),
    property_id: readUuid(row.property_id),
    property_title: readText(row.property_title, 160),
    area,
    price_m2: priceM2,
    price,
    price_after_discount: priceAfterDiscount,
    discounts: parseStoredDiscounts(row.discounts),
    developer_promo: normalizeDeveloperPromo(
      typeof row.developer_promo === "string" ? row.developer_promo : null,
    ),
    markup_pct: markupPct,
    markup: readText(row.markup, 40) ?? formatMarkup(markupPct),
    months,
    term_label: readText(row.term_label, 80) ?? formatTermMonths(months),
    down_m2: downM2,
    down_lump: downLump,
    down_payment: downPayment,
    remaining,
    total,
    monthly,
    floor_plan_url: floorPlan,
  };
}

function parseStoredDiscounts(value: unknown): QuoteDiscount[] {
  if (!Array.isArray(value)) return [];
  const discounts: QuoteDiscount[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const row = item as Record<string, unknown>;
    const amount = readNumber(row.amount);
    const numeric = readNumber(row.value);
    if (amount === null || amount <= 0 || numeric === null || numeric <= 0) continue;
    const mode: QuoteDiscountMode = row.mode === "percent" ? "percent" : "amount";
    discounts.push({
      label: readText(row.label, 40) ?? "Скидка",
      mode,
      value: clamp(numeric, 0.01, mode === "percent" ? 90 : 5_000_000_000),
      amount: clamp(amount, 0.01, 5_000_000_000),
    });
    if (discounts.length >= DISCOUNT_MAX) break;
  }
  return discounts;
}

export function parseShareQuotes(value: unknown): ApartmentQuote[] {
  if (!Array.isArray(value)) return [];
  const quotes: ApartmentQuote[] = [];
  for (const item of value) {
    const quote = parseShareQuote(item);
    if (!quote) continue;
    quotes.push(quote);
    if (quotes.length >= QUOTE_MAX) break;
  }
  return quotes;
}

export function quoteKey(quote: ApartmentQuote, index: number) {
  if (quote.calculation_id) return `calc:${quote.calculation_id}`;
  if (quote.id) return `quote:${quote.id}`;
  return `legacy:${index}:${quote.property_id ?? ""}:${quote.price}:${quote.months}:${quote.markup_pct}`;
}

export function quoteToJson(quote: ApartmentQuote) {
  return {
    id: quote.id,
    calculation_id: quote.calculation_id,
    property_id: quote.property_id,
    property_title: quote.property_title,
    area: quote.area,
    price_m2: quote.price_m2,
    price: quote.price,
    price_after_discount: quote.price_after_discount,
    discounts: quote.discounts.map((discount) => ({
      label: discount.label,
      mode: discount.mode,
      value: discount.value,
      amount: discount.amount,
    })),
    developer_promo: quote.developer_promo,
    markup: quote.markup,
    markup_pct: quote.markup_pct,
    months: quote.months,
    term_label: quote.term_label,
    down_m2: quote.down_m2,
    down_lump: quote.down_lump,
    down_payment: quote.down_payment,
    remaining: quote.remaining,
    total: quote.total,
    monthly: quote.monthly,
    floor_plan_url: quote.floor_plan_url,
  };
}

export function quotesToJson(quotes: ApartmentQuote[]) {
  return quotes.slice(0, QUOTE_MAX).map(quoteToJson);
}

export function quoteSummary(quote: Pick<
  ApartmentQuote,
  "property_title" | "area" | "term_label"
>) {
  return [quote.property_title, quote.area ? formatArea(quote.area) : null, quote.term_label]
    .filter(Boolean)
    .join(" · ");
}

export function mapCalculationRow(value: unknown): ApartmentCalculation | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const row = value as Record<string, unknown>;
  const id = readUuid(row.id);
  const createdBy = readUuid(row.created_by);
  if (!id || !createdBy) return null;
  const quote = parseShareQuote({ ...row, calculation_id: id });
  if (!quote) return null;
  const createdAt = typeof row.created_at === "string" ? row.created_at : "";
  const updatedAt = typeof row.updated_at === "string" ? row.updated_at : createdAt;
  return {
    ...quote,
    id,
    calculation_id: id,
    created_by: createdBy,
    created_at: createdAt,
    updated_at: updatedAt,
  };
}

export function calculationToQuote(
  calculation: ApartmentCalculation,
  quoteId: string,
): ApartmentQuote {
  return {
    ...calculation,
    id: quoteId,
    calculation_id: calculation.id,
  };
}
