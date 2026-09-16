import { describe, expect, it } from "vitest";
import {
  catalogLocationLabel,
  emptyCatalog,
  hasCommercialCatalog,
  hasInstallmentCatalog,
  visibleDocuments,
} from "@/lib/catalog";
import { isPresentCookie } from "@/lib/present-mode";
import type { Property } from "@/lib/types";

function property(overrides: Partial<Property> = {}): Property {
  return {
    id: "p1",
    title: "8 марта",
    property_type: "apartment",
    listing_type: "sale",
    status: "active",
    price: 0,
    area: null,
    rooms: 4,
    address: null,
    city: "Грозный",
    district: "8 марта",
    description: null,
    cover_url: null,
    developer: "КорматСтрой",
    completion_year: "2028",
    installment_max: "5 лет",
    maternity_capital: false,
    has_large_apartments: true,
    relevance: 3,
    catalog: emptyCatalog(),
    assigned_to: null,
    created_by: null,
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("catalog helpers", () => {
  it("detects commercial from payload, not only property type", () => {
    expect(hasCommercialCatalog(property())).toBe(false);
    expect(
      hasCommercialCatalog(
        property({
          catalog: {
            commercial: [{ title: "Коммерция", items: [], note: "Коммерция" }],
          },
        }),
      ),
    ).toBe(false);
    expect(
      hasCommercialCatalog(
        property({
          catalog: {
            commercial: [
              { title: "Коммерция", items: [{ label: "ул. 8 марта", value: "160 тыс" }] },
            ],
          },
        }),
      ),
    ).toBe(true);
  });

  it("prefers catalog address over district", () => {
    expect(
      catalogLocationLabel(
        property({
          catalog: { location: { address: "улица Гуцериева, 80" } },
        }),
      ),
    ).toBe("улица Гуцериева, 80");
  });

  it("sees installment from either column or catalog", () => {
    expect(hasInstallmentCatalog(property({ installment_max: null }))).toBe(false);
    expect(
      hasInstallmentCatalog(
        property({
          installment_max: null,
          catalog: {
            installment: [{ title: "Рассрочка", items: [{ label: "1 год", value: "0%" }] }],
          },
        }),
      ),
    ).toBe(true);
  });

  it("hides map links and raw urls in documents", () => {
    const docs = visibleDocuments({
      location: { map_url: "https://go.2gis.com/x" },
      documents: [
        { title: "https://docs.google.com/x", url: "https://docs.google.com/x", kind: "chess" },
        { title: "Карта", url: "https://go.2gis.com/x", kind: "map" },
      ],
    });
    expect(docs).toEqual([
      { title: "Шахматка", url: "https://docs.google.com/x", kind: "chess" },
    ]);
  });

  it("treats only 1 as present-mode cookie", () => {
    expect(isPresentCookie("1")).toBe(true);
    expect(isPresentCookie("0")).toBe(false);
  });
});
