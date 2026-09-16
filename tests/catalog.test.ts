import { describe, expect, it } from "vitest";
import {
  catalogLocationLabel,
  catalogLocationPhotos,
  catalogMaterialStatus,
  catalogPhotos,
  catalogPricePhotos,
  compactAbout,
  compactFacts,
  compactTermGroups,
  completionLabel,
  emptyCatalog,
  formatAboutBlocks,
  hasCommercialCatalog,
  hasInstallmentCatalog,
  matchesCatalogSearch,
  visibleDocuments,
} from "@/lib/catalog";
import {
  isShareId,
  isShareToken,
  isShareTtlDays,
  parseOpenCatalogShare,
  sanitizeSharePropertyIds,
  sharePath,
  whatsappShareUrl,
} from "@/lib/catalog-share";
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

describe("catalog search", () => {
  it("matches title, developer, city and visible location as whole words", () => {
    const luch = property({
      title: "Луч",
      district: "Луч",
      city: "Грозный",
      developer: "ДСК",
      catalog: { location: { address: "Луч" } },
    });
    expect(matchesCatalogSearch(luch, "Луч")).toBe(true);
    expect(matchesCatalogSearch(luch, "дск")).toBe(true);
    expect(matchesCatalogSearch(luch, "грозный")).toBe(true);
    expect(matchesCatalogSearch(property({ title: "Авалон" }), "Луч")).toBe(
      false,
    );
  });

  it("matches the district filter even when the card address is different", () => {
    expect(
      matchesCatalogSearch(
        property({
          title: "Рассвет",
          district: "Луч",
          catalog: {
            location: { address: "Байсангуровский, район Грозного" },
          },
        }),
        "Луч",
      ),
    ).toBe(true);
    expect(
      matchesCatalogSearch(
        property({
          title: "Рассвет 2",
          district: "Луч",
          catalog: { location: { address: "Ленгородок, микрорайон, Грозный" } },
        }),
        "Луч",
      ),
    ).toBe(true);
    expect(
      matchesCatalogSearch(
        property({
          title: "Дружба",
          district: "Луч",
          catalog: { location: { address: "Ленгородок, микрорайон, Грозный" } },
        }),
        "Ленгородок",
      ),
    ).toBe(true);
    expect(
      matchesCatalogSearch(
        property({
          title: "Авалон",
          district: "Минутка",
          description: "самый лучший вид и лучшие условия",
          address: "лучший квартал",
        }),
        "Луч",
      ),
    ).toBe(false);
  });

  it("allows a longer prefix and requires every token", () => {
    expect(
      matchesCatalogSearch(
        property({ developer: "КорматСтрой", title: "8 марта" }),
        "кормат",
      ),
    ).toBe(true);
    expect(
      matchesCatalogSearch(
        property({ title: "8 марта", city: "Грозный", district: "8 марта" }),
        "8 марта грозный",
      ),
    ).toBe(true);
    expect(
      matchesCatalogSearch(
        property({ title: "8 марта", city: "Аргун" }),
        "8 марта грозный",
      ),
    ).toBe(false);
  });
});

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
        {
          title: "Yandex Finds everything https://disk.yandex.ru/i/x",
          url: "https://disk.yandex.ru/i/x",
          kind: "plan",
        },
        {
          title: "КОММЕРЦИЯ 8 МАРТА https://docs.google.com/y",
          url: "https://docs.google.com/y",
          kind: "chess",
        },
      ],
    });
    expect(docs).toEqual([
      { title: "Шахматка", url: "https://docs.google.com/x", kind: "chess" },
      { title: "Планировки", url: "https://disk.yandex.ru/i/x", kind: "plan" },
      { title: "Коммерция", url: "https://docs.google.com/y", kind: "chess" },
    ]);
  });

  it("reports missing price, chess and map instead of hiding them", () => {
    expect(catalogMaterialStatus(property())).toEqual({
      price: false,
      chess: false,
      map: false,
    });
    expect(
      catalogMaterialStatus(
        property({
          catalog: {
            price_photos: ["https://cdn.example/price/1.webp"],
            location: { map_url: "https://go.2gis.com/x" },
            documents: [
              {
                title: "https://docs.google.com/x",
                url: "https://docs.google.com/x",
                kind: "chess",
              },
              {
                title: "КОММЕРЦИЯ",
                url: "https://docs.google.com/y",
                kind: "chess",
              },
            ],
          },
        }),
      ),
    ).toEqual({ price: true, chess: true, map: true });
  });

  it("treats only 1 as present-mode cookie", () => {
    expect(isPresentCookie("1")).toBe(true);
    expect(isPresentCookie("0")).toBe(false);
  });

  it("treats rooms as completion quarter, not apartment rooms", () => {
    expect(completionLabel(property())).toBe("сдача IV кв. 2028");
    expect(completionLabel(property({ rooms: 1, completion_year: "2026" }))).toBe(
      "сдача I кв. 2026",
    );
    expect(completionLabel(property({ rooms: null }))).toBe("сдача 2028");
    expect(
      completionLabel(property({ rooms: 4, completion_year: "Дом сдан" })),
    ).toBe("Дом сдан · IV кв.");
  });

  it("builds a unique photo list from cover and catalog", () => {
    expect(catalogPhotos(property())).toEqual([]);
    expect(
      catalogPhotos(
        property({
          cover_url: "https://cdn.example/cover.webp",
          catalog: {
            photos: [
              "https://cdn.example/cover.webp",
              "https://cdn.example/2.webp",
              "https://cdn.example/2.webp",
            ],
          },
        }),
      ),
    ).toEqual([
      "https://cdn.example/cover.webp",
      "https://cdn.example/2.webp",
    ]);
    expect(
      catalogPhotos(
        property({
          cover_url: "https://cdn.example/id.webp",
          catalog: {
            photos: [
              "https://cdn.example/id.webp",
              "https://cdn.example/id/gallery/01.webp",
              "https://cdn.example/id/gallery/02.webp",
            ],
          },
        }),
      ),
    ).toEqual([
      "https://cdn.example/id/gallery/01.webp",
      "https://cdn.example/id/gallery/02.webp",
    ]);
    expect(
      catalogPhotos(
        property({
          cover_url: "https://cdn.example/complexes/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee.webp",
          catalog: {
            photos: [
              "https://cdn.example/complexes/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee/extra.webp",
              "https://cdn.example/complexes/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee/gallery/01.webp",
            ],
          },
        }),
      ),
    ).toEqual([
      "https://cdn.example/complexes/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee/gallery/01.webp",
      "https://cdn.example/complexes/aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee/extra.webp",
    ]);
  });

  it("keeps price screenshots out of the complex gallery", () => {
    const item = property({
      cover_url: "https://cdn.example/cover.webp",
      catalog: {
        photos: [
          "https://cdn.example/cover.webp",
          "https://cdn.example/2.webp",
          "https://cdn.example/price.webp",
        ],
        price_photos: ["https://cdn.example/price.webp"],
      },
    });
    expect(catalogPhotos(item)).toEqual([
      "https://cdn.example/cover.webp",
      "https://cdn.example/2.webp",
    ]);
    expect(catalogPricePhotos(item)).toEqual(["https://cdn.example/price.webp"]);
  });

  it("prefers classified price-folder screenshots over leftover gallery files", () => {
    expect(
      catalogPricePhotos(
        property({
          catalog: {
            price_photos: [
              "https://cdn.example/id/07.webp",
              "https://cdn.example/id/price/01.webp",
              "https://cdn.example/id/price/01.webp",
            ],
          },
        }),
      ),
    ).toEqual(["https://cdn.example/id/price/01.webp"]);
  });

  it("merges repeating installment tables and leftover notes", () => {
    expect(
      compactTermGroups([
        {
          title: "Рассрочка",
          items: [
            { label: "1 год", value: "0%" },
            { label: "2 года", value: "15%" },
          ],
          note: "Перерасчет делаем на любой срок\nСдача дома 4 квартал 2028 год",
        },
        {
          title: "Рассрочка по годам",
          items: [
            { label: "1 год", value: "без наценки" },
            { label: "2 года", value: "15%" },
            { label: "3 года", value: "25%" },
          ],
        },
      ]),
    ).toEqual([
      {
        title: "Рассрочка",
        items: [
          { label: "1 год", value: "0%" },
          { label: "2 года", value: "15%" },
          { label: "3 года", value: "25%" },
        ],
        note: "Перерасчет делаем на любой срок",
      },
    ]);
  });

  it("drops about lines already shown in facts or hero", () => {
    const about = compactAbout(
      "Информация про ЖК 8 Марта\nУлица Гуцериева, 80\nскидки участникам СВО\nПерерасчет делаем на любой срок\nСдача дома 4 квартал 2028 год",
      ["Улица Гуцериева, 80 в Грозном"],
    );
    expect(about).toBe("скидки участникам СВО");
    expect(
      compactFacts(
        [
          { label: "Адрес", value: "Улица Гуцериева, 80" },
          { label: "Фасад", value: "кирпич" },
        ],
        [about, "Улица Гуцериева, 80 в Грозном"],
      ),
    ).toEqual([{ label: "Фасад", value: "кирпич" }]);
  });

  it("keeps location photos out of the gallery and formats short about as a list", () => {
    const item = property({
      cover_url: "https://cdn.example/cover.webp",
      catalog: {
        photos: ["https://cdn.example/cover.webp", "https://cdn.example/map.webp"],
        location: { photos: ["https://cdn.example/map.webp"] },
      },
    });
    expect(catalogPhotos(item)).toEqual(["https://cdn.example/cover.webp"]);
    expect(catalogLocationPhotos(item)).toEqual(["https://cdn.example/map.webp"]);
    expect(
      catalogLocationPhotos(
        property({
          catalog: {
            location: {
              photos: [
                "https://share.api.2gis.ru/getimage?city=grozny",
                "https://cdn.example/location/01.webp",
              ],
            },
          },
        }),
      ),
    ).toEqual(["https://cdn.example/location/01.webp"]);
    expect(formatAboutBlocks("Этажность 16\nфасад кирпич\n(не возвращаем)")).toEqual([
      { type: "list", items: ["Этажность: 16", "Фасад: кирпич (не возвращаем)"] },
    ]);
  });
});

describe("catalog share helpers", () => {
  it("keeps unique valid ids and caps the shortlist", () => {
    expect(
      sanitizeSharePropertyIds([
        "35ab9d42-9bfc-4e86-9da4-814e29f257dd",
        "35ab9d42-9bfc-4e86-9da4-814e29f257dd",
        "not-a-uuid",
        "cd52e55c-a354-4a5d-818c-d566b9d63712",
      ]),
    ).toEqual([
      "35ab9d42-9bfc-4e86-9da4-814e29f257dd",
      "cd52e55c-a354-4a5d-818c-d566b9d63712",
    ]);
    expect(isShareTtlDays(3)).toBe(true);
    expect(isShareTtlDays(2)).toBe(false);
    expect(isShareToken("nSZp2YxXpfJeyW-Y91lEonnL")).toBe(true);
    expect(isShareToken("short")).toBe(false);
    expect(isShareId("35ab9d42-9bfc-4e86-9da4-814e29f257dd")).toBe(true);
    expect(isShareId("not-a-uuid")).toBe(false);
    expect(sharePath("abc")).toBe("/s/abc");
    expect(whatsappShareUrl("https://example.com/s/abc")).toContain(
      "wa.me/?text=",
    );
    expect(parseOpenCatalogShare({ ok: false, reason: "revoked" })).toEqual({
      ok: false,
      reason: "revoked",
    });
    expect(parseOpenCatalogShare({ ok: true, title: "Подборка", properties: [] })).toMatchObject({
      ok: true,
      title: "Подборка",
      properties: [],
    });
  });
});
