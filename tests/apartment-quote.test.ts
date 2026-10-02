import { describe, expect, it } from "vitest";
import {
  calculateApartmentQuote,
  defaultInstallmentTerm,
  discountCaption,
  isFloorPlanUrl,
  parseInstallmentTerms,
  parseMarkupPercent,
  parseShareQuotes,
  quoteKey,
  quotesToJson,
  suggestDownPayment,
} from "@/lib/apartment-quote";
import { parseOpenCatalogShare } from "@/lib/catalog-share";

describe("apartment quote math", () => {
  it("matches a saved installment with a per-meter down payment", () => {
    const quote = calculateApartmentQuote({
      area: 89,
      priceM2: 61000,
      price: null,
      markupPct: 35,
      months: 60,
      downM2: 4000,
      downLump: 0,
    });
    expect(quote).toMatchObject({
      price: 5429000,
      downPayment: 356000,
      remaining: 6848550,
      total: 7204550,
      monthly: 114143,
      markup: "35%",
    });
  });

  it("matches a full-price installment without a down payment", () => {
    const quote = calculateApartmentQuote({
      area: null,
      priceM2: null,
      price: 8500000,
      markupPct: 25,
      months: 36,
      downM2: 0,
      downLump: 0,
    });
    expect(quote).toMatchObject({
      price: 8500000,
      downPayment: 0,
      remaining: 10625000,
      total: 10625000,
      monthly: 295139,
    });
  });

  it("does not mark up a cash purchase", () => {
    const quote = calculateApartmentQuote({
      area: 40,
      priceM2: 100000,
      price: null,
      markupPct: 20,
      months: 0,
      downM2: 0,
      downLump: 0,
    });
    expect(quote).toMatchObject({
      price: 4000000,
      remaining: 0,
      total: 4000000,
      monthly: 0,
    });
  });

  it("clamps a down payment above the price", () => {
    const quote = calculateApartmentQuote({
      area: 50,
      priceM2: 100000,
      price: null,
      markupPct: 10,
      months: 12,
      downM2: 0,
      downLump: 9_000_000,
    });
    expect(quote?.downClamped).toBe(true);
    expect(quote?.downPayment).toBe(5_000_000);
    expect(quote?.remaining).toBe(0);
    expect(quote?.total).toBe(5_000_000);
  });
});

describe("installment defaults", () => {
  const groups = [
    {
      title: "Рассрочка",
      note: "Обязательный платёж - 4000\nОбязательный платёж = 35 000",
      items: [
        { label: "2 года", value: "без наценки" },
        { label: "3 года", value: "20%" },
        { label: "Максимальный срок", value: "5 лет" },
      ],
    },
  ];

  it("reads markup terms and ignores a max-term label without a percent", () => {
    expect(parseInstallmentTerms(groups).map((term) => [term.label, term.markupPct])).toEqual([
      ["2 года", 0],
      ["3 года", 20],
    ]);
    expect(defaultInstallmentTerm(parseInstallmentTerms(groups), "3 года")?.label).toBe(
      "3 года",
    );
    expect(parseMarkupPercent("20%")).toBe(20);
    expect(parseMarkupPercent("10%")).toBe(10);
    expect(parseMarkupPercent("0%")).toBe(0);
    expect(parseMarkupPercent("без наценки")).toBe(0);
  });

  it("subtracts discounts after markup, leaving the down payment and remainder unchanged", () => {
    const quote = calculateApartmentQuote({
      area: 89,
      priceM2: 61000,
      price: null,
      markupPct: 35,
      months: 60,
      downM2: 4000,
      downLump: 0,
      discounts: [
        { label: "Семейная", mode: "percent", value: 3 },
        { label: "Отделка", mode: "amount", value: 100000 },
      ],
      developerPromo: "  отопление в подарок  ",
    });
    expect(quote).toMatchObject({
      price: 5429000,
      downPayment: 356000,
      remaining: 6848550,
      discountTotal: 262870,
      discounts: [
        { label: "Семейная", mode: "percent", value: 3, amount: 162870 },
        { label: "Отделка", mode: "amount", value: 100000, amount: 100000 },
      ],
      total: 6941680,
      monthly: 109761,
      developerPromo: "отопление в подарок",
    });
  });

  it("keeps a ruble of price when discounts would wipe it out", () => {
    const quote = calculateApartmentQuote({
      area: null,
      priceM2: null,
      price: 1000000,
      markupPct: 0,
      months: 0,
      downM2: 0,
      downLump: 0,
      discounts: [
        { label: "", mode: "percent", value: 90 },
        { label: "Ещё", mode: "amount", value: 500000 },
      ],
    });
    expect(quote?.discounts[0]?.label).toBe("Скидка");
    expect(quote?.total).toBe(1);
    expect(quote?.price).toBe(1000000);
  });

  it("prefixes the agent discount name and does not add a comma", () => {
    expect(
      discountCaption({ label: "Семейная", mode: "percent", value: 3, amount: 1 }),
    ).toBe("Скидка Семейная 3%");
    expect(
      discountCaption({ label: "Отделка", mode: "amount", value: 100000, amount: 100000 }),
    ).toBe("Скидка Отделка");
    expect(
      discountCaption({ label: "Скидка", mode: "percent", value: 3, amount: 1 }),
    ).toBe("Скидка 3%");
    expect(
      discountCaption({ label: "Скидка на кухню", mode: "amount", value: 1, amount: 1 }),
    ).toBe("Скидка на кухню");
  });

  it("does not let a discount change the down payment or the marked-up remainder", () => {
    const plain = calculateApartmentQuote({
      area: 89,
      priceM2: 61000,
      price: null,
      markupPct: 35,
      months: 60,
      downM2: 4000,
      downLump: 0,
    });
    const discounted = calculateApartmentQuote({
      area: 89,
      priceM2: 61000,
      price: null,
      markupPct: 35,
      months: 60,
      downM2: 4000,
      downLump: 0,
      discounts: [{ label: "Семейная", mode: "percent", value: 3 }],
    });
    expect(discounted?.downPayment).toBe(plain?.downPayment);
    expect(discounted?.remaining).toBe(plain?.remaining);
    expect(discounted?.total).toBe((plain?.total ?? 0) - 162870);
    expect(discounted?.discountCapped).toBe(false);
  });

  it("caps a discount that is larger than the marked-up remainder", () => {
    const quote = calculateApartmentQuote({
      area: null,
      priceM2: null,
      price: 1000000,
      markupPct: 0,
      months: 12,
      downM2: 0,
      downLump: 900000,
      discounts: [{ label: "Большая", mode: "amount", value: 500000 }],
    });
    expect(quote?.downPayment).toBe(900000);
    expect(quote?.remaining).toBe(100000);
    expect(quote?.discountCapped).toBe(true);
    expect(quote?.discounts[0]?.amount).toBe(99999);
    expect(quote?.total).toBe(900001);
  });

  it("reduces a cash price and leaves the installment fields at zero", () => {
    const quote = calculateApartmentQuote({
      area: null,
      priceM2: null,
      price: 2000000,
      markupPct: 25,
      months: 0,
      downM2: 0,
      downLump: 0,
      discounts: [{ label: "Наличные", mode: "percent", value: 10 }],
    });
    expect(quote).toMatchObject({
      remaining: 0,
      monthly: 0,
      downPayment: 0,
      total: 1800000,
      discounts: [{ label: "Наличные", mode: "percent", value: 10, amount: 200000 }],
    });
  });

  it("suggests a small obligatory payment as price per meter", () => {
    expect(suggestDownPayment(groups[0]?.note)).toEqual({
      downM2: 4000,
      downLump: 0,
    });
  });
});

describe("share quote snapshots", () => {
  const legacy = {
    area: 89,
    price: 5429000,
    total: 7204550,
    markup: "35%",
    months: 60,
    down_m2: 4000,
    monthly: 114143,
    price_m2: 61000,
    down_lump: 0,
    remaining: 6848550,
    markup_pct: 35,
    term_label: "5 лет",
    property_id: "35ab9d42-9bfc-4e86-9da4-814e29f257dd",
    down_payment: 356000,
    floor_plan_url: "javascript:alert(1)",
    secret: "не для клиента",
  };

  it("keeps legacy numbers and drops unsafe floor plans", () => {
    const [quote] = parseShareQuotes([legacy, { price: 0 }, "нет"]);
    expect(quote).toMatchObject({
      price: 5429000,
      monthly: 114143,
      total: 7204550,
      term_label: "5 лет",
      floor_plan_url: null,
      discounts: [],
      developer_promo: null,
      price_after_discount: 5429000,
    });
    expect(quoteKey(quote!, 0)).toContain("legacy:");
    expect(quotesToJson([quote!])[0]).not.toHaveProperty("secret");
  });

  it("keeps two discounts and a developer promo, and drops junk", () => {
    const [quote] = parseShareQuotes([
      {
        price: 1000000,
        price_after_discount: 850000,
        developer_promo: "  перегородки  ",
        discounts: [
          { label: "Семейная", mode: "percent", value: 10, amount: 100000 },
          { label: "Скрипт", mode: "amount", value: 50000, amount: 50000, extra: true },
          { label: "Третья", mode: "amount", value: 1, amount: 1 },
        ],
      },
    ]);
    expect(quote?.developer_promo).toBe("перегородки");
    expect(quote?.price_after_discount).toBe(850000);
    expect(quote?.discounts).toEqual([
      { label: "Семейная", mode: "percent", value: 10, amount: 100000 },
      { label: "Скрипт", mode: "amount", value: 50000, amount: 50000 },
    ]);
    expect(quotesToJson([quote!])[0]?.discounts).toHaveLength(2);
  });

  it("accepts only floor-plan storage URLs", () => {
    const url =
      "https://psfqwkwlawvpvgxectxu.supabase.co/storage/v1/object/public/floor-plans/11111111-1111-4111-8111-111111111111/plan.webp";
    expect(isFloorPlanUrl(url)).toBe(true);
    expect(isFloorPlanUrl("https://example.com/plan.webp")).toBe(false);
    expect(isFloorPlanUrl("http://localhost/plan.webp")).toBe(false);
  });

  it("parses quotes from the public share payload", () => {
    const parsed = parseOpenCatalogShare({
      ok: true,
      title: "Подборка",
      properties: [],
      quotes: [legacy],
    });
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.quotes).toHaveLength(1);
      expect(parsed.quotes[0]?.floor_plan_url).toBeNull();
      expect(parsed.quotes[0]?.monthly).toBe(114143);
    }
  });
});
