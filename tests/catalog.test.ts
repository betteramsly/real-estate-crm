import { describe, expect, it } from "vitest";
import {
  catalogListProperty,
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
  inferCatalogDocumentKind,
  isClientExternalUrl,
  isPresentCatalogDocument,
  catalogQueryIsActive,
  catalogTitleLeadsSearch,
  matchesCatalogSearch,
  installmentFilterLabel,
  sortInstallmentTerms,
  visibleDocuments,
} from "@/lib/catalog";
import {
  isMissingQuotesColumn,
  isShareId,
  isShareToken,
  isShareTtlDays,
  agentWhatsappUrl,
  parseOpenCatalogShare,
  parseShareAgent,
  phoneToWhatsapp,
  sanitizeSharePropertyIds,
  sharePath,
  shareStatsLabel,
  summarizeShareEvents,
  whatsappShareUrl,
} from "@/lib/catalog-share";
import {
  browseCatalog,
  catalogBrowseSearchFromSources,
  catalogBrowseSearchParams,
  catalogBrowseState,
  districtsForCities,
  EMPTY_CATALOG_FACETS,
} from "@/lib/catalog-browse";
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
    cash_payment: false,
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
        }),
        "Луч",
      ),
    ).toBe(false);
  });

  it("searches the street and keeps a short prefix on that street", () => {
    expect(
      matchesCatalogSearch(
        property({ title: "Авалон", address: "ул. Пушкина, 10" }),
        "Пушкина",
      ),
    ).toBe(true);
    expect(
      matchesCatalogSearch(
        property({ title: "Авалон", address: "лучший квартал" }),
        "Луч",
      ),
    ).toBe(true);
    expect(catalogQueryIsActive("в")).toBe(false);
    expect(catalogQueryIsActive("ву")).toBe(true);
    expect(catalogTitleLeadsSearch("Вулф Тауэрс", "вул")).toBe(true);
    expect(catalogTitleLeadsSearch("Вулф Тауэрс", "тауэрс")).toBe(false);
    expect(catalogTitleLeadsSearch("Вулф Тауэрс", "в")).toBe(false);
  });

  it("treats an empty query as the full list", () => {
    const item = property({ title: "Вулф Тауэрс" });
    expect(matchesCatalogSearch(item, "")).toBe(true);
    expect(matchesCatalogSearch(item, "   ")).toBe(true);
  });

  it("allows a longer prefix and requires every token", () => {
    expect(
      matchesCatalogSearch(property({ title: "Вулф Тауэрс" }), "вул"),
    ).toBe(true);
    expect(
      matchesCatalogSearch(property({ title: "Вулф Тауэрс" }), "ву"),
    ).toBe(true);
    expect(
      matchesCatalogSearch(property({ title: "Вулф Тауэрс" }), "в"),
    ).toBe(false);
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

describe("catalog browse", () => {
  const facets = (
    overrides: Partial<typeof EMPTY_CATALOG_FACETS> = {},
  ) => ({ ...EMPTY_CATALOG_FACETS, ...overrides });

  it("keeps the full list until a token has two characters", () => {
    const items = [
      property({ id: "1", title: "Бета" }),
      property({ id: "2", title: "Вулф" }),
    ];
    expect(browseCatalog(items, facets(), "в").map((item) => item.id)).toEqual([
      "1",
      "2",
    ]);
    expect(browseCatalog(items, facets(), "ву").map((item) => item.id)).toEqual([
      "2",
    ]);
  });

  it("floats titles that start with the query and keeps the rest in place", () => {
    const items = [
      property({ id: "1", title: "Альфа", developer: "Вулф Групп", relevance: 3 }),
      property({ id: "2", title: "Вулф Тауэрс", relevance: 1 }),
      property({ id: "3", title: "Вулкан", relevance: 2 }),
    ];
    expect(browseCatalog(items, facets(), "вул").map((item) => item.id)).toEqual([
      "2",
      "3",
      "1",
    ]);
    const sameCity = [
      property({ id: "1", title: "Альфа", city: "Грозный" }),
      property({ id: "2", title: "Бета", city: "Грозный" }),
    ];
    expect(
      browseCatalog(sameCity, facets(), "грозный").map((item) => item.id),
    ).toEqual(["1", "2"]);
  });

  it("applies every filter and treats installment 1 as any term", () => {
    const grozny = property({
      id: "grozny",
      city: "Грозный",
      district: "Луч",
      installment_max: "5 лет",
      maternity_capital: true,
    });
    const argun = property({
      id: "argun",
      city: "Аргун",
      district: "Центр",
      installment_max: null,
      maternity_capital: true,
    });
    const cashOnly = property({
      id: "cash",
      city: "Грозный",
      district: "Луч",
      installment_max: "2 года",
      maternity_capital: false,
    });
    expect(
      browseCatalog(
        [grozny, argun, cashOnly],
        facets({ city: ["Грозный"], district: ["Луч"], maternity: true }),
        "",
      ).map((item) => item.id),
    ).toEqual(["grozny"]);
    expect(
      browseCatalog([grozny, argun], facets({ installment: ["1"] }), "").map(
        (item) => item.id,
      ),
    ).toEqual(["grozny"]);
    expect(
      browseCatalog(
        [grozny, cashOnly],
        facets({ installment: ["5 лет", "1"] }),
        "",
      ).map((item) => item.id),
    ).toEqual(["grozny"]);
    expect(
      browseCatalog(
        [
          grozny,
          property({
            id: "shop",
            property_type: "commercial",
          }),
        ],
        facets({ commercial: true }),
        "",
      ).map((item) => item.id),
    ).toEqual(["shop"]);
  });

  it("limits districts to the selected cities and drops the rest", () => {
    const rows = [
      property({ city: "Грозный", district: "Луч" }),
      property({ id: "p2", city: "Аргун", district: "Центр" }),
    ];
    expect(districtsForCities(rows, [])).toEqual(["Луч", "Центр"]);
    expect(districtsForCities(rows, ["Грозный"])).toEqual(["Луч"]);
    expect(
      catalogBrowseState("city=Грозный&district=Центр,Луч", rows).facets.district,
    ).toEqual(["Луч"]);
  });

  it("keeps a shared link ahead of a remembered browse", () => {
    expect(catalogBrowseSearchFromSources("city=Грозный", "q=вул")).toBe(
      "city=Грозный",
    );
    expect(catalogBrowseSearchFromSources("", "q=вул")).toBe("q=вул");
  });

  it("round-trips the address bar without a one-off installment flag", () => {
    const selected = facets({
      city: ["Грозный", "Аргун"],
      installment: ["1"],
      maternity: true,
    });
    const params = catalogBrowseSearchParams(selected, "  вул ");
    expect(params.get("q")).toBe("вул");
    expect(params.get("maternity")).toBe("1");
    expect(params.get("installment")).toBe("1");
    expect(catalogBrowseState(params.toString(), []).facets).toEqual(selected);
  });
});

describe("catalog list rows", () => {
  it("keeps the street and one gallery photo without the description", () => {
    const card = catalogListProperty({
      ...property(),
      photos: ["https://cdn.example/gallery/1.webp"],
      price_photos: [],
      location: { address: "ул. Пушкина, 10" },
      commercial: [],
      installment: [],
    });
    expect(card.description).toBeNull();
    expect(card.catalog?.location?.address).toBe("ул. Пушкина, 10");
    expect(card.catalog?.photos).toEqual(["https://cdn.example/gallery/1.webp"]);
    expect(matchesCatalogSearch(card, "Пушкина")).toBe(true);
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

  it("sorts installment terms by years", () => {
    expect(sortInstallmentTerms(["5 лет", "1 год", "4 года", "2 года"])).toEqual([
      "1 год",
      "2 года",
      "4 года",
      "5 лет",
    ]);
  });

  it("labels installment filters in the genitive", () => {
    expect(installmentFilterLabel("1 год")).toBe("до 1 года");
    expect(installmentFilterLabel("2 года")).toBe("до 2 лет");
    expect(installmentFilterLabel("5 лет")).toBe("до 5 лет");
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
    expect(
      visibleDocuments(
        {
          documents: [
            { title: "Шахматка", url: "https://docs.google.com/x", kind: "chess" },
            { title: "Планировки", url: "https://disk.yandex.ru/i/x", kind: "plan" },
            { title: "Коммерция", url: "https://docs.google.com/y", kind: "commercial" },
            { title: "Прайс", url: "https://docs.google.com/z", kind: "price" },
          ],
        },
        { client: true, chess: true },
      ),
    ).toEqual([
      { title: "Шахматка", url: "https://docs.google.com/x", kind: "chess" },
      { title: "Планировки", url: "https://disk.yandex.ru/i/x", kind: "plan" },
      { title: "Коммерция", url: "https://docs.google.com/y", kind: "commercial" },
      { title: "Прайс", url: "https://docs.google.com/z", kind: "price" },
    ]);
    expect(
      visibleDocuments(
        {
          documents: [
            { title: "Шахматка", url: "https://docs.google.com/x", kind: "chess" },
            { title: "Планировки", url: "https://disk.yandex.ru/i/x", kind: "plan" },
            { title: "Коммерция", url: "https://docs.google.com/y", kind: "commercial" },
            { title: "Прайс", url: "https://docs.google.com/z", kind: "price" },
          ],
        },
        { client: true },
      ),
    ).toEqual([
      { title: "Планировки", url: "https://disk.yandex.ru/i/x", kind: "plan" },
      { title: "Коммерция", url: "https://docs.google.com/y", kind: "commercial" },
      { title: "Прайс", url: "https://docs.google.com/z", kind: "price" },
    ]);
  });

  it("keeps plans and commercial visible for a client presentation and hides chess on the share link", () => {
    expect(
      isPresentCatalogDocument(
        {
          title: "Шахматка",
          url: "https://docs.google.com/x",
          kind: "chess",
        },
        { chess: true },
      ),
    ).toBe(true);
    expect(
      isPresentCatalogDocument({
        title: "Шахматка",
        url: "https://docs.google.com/x",
        kind: "chess",
      }),
    ).toBe(false);
    expect(
      isPresentCatalogDocument({
        title: "Коммерция",
        url: "https://docs.google.com/y",
        kind: "commercial",
      }),
    ).toBe(true);
    expect(
      isPresentCatalogDocument({
        title: "Планировки",
        url: "https://disk.yandex.ru/i/x",
        kind: "plan",
      }),
    ).toBe(true);
    expect(
      isPresentCatalogDocument({
        title: "Прайс",
        url: "https://docs.google.com/z",
        kind: "price",
      }),
    ).toBe(true);
    expect(inferCatalogDocumentKind("планировки.pdf")).toBe("plan");
    expect(inferCatalogDocumentKind("шахматка.xlsx")).toBe("chess");
  });

  it("allows location, plan, price and commercial links for a client, and chess only when showing in person", () => {
    expect(isClientExternalUrl("https://go.2gis.com/x")).toBe(true);
    expect(isClientExternalUrl("https://yandex.ru/maps/1")).toBe(true);
    expect(
      isClientExternalUrl("https://disk.yandex.ru/d/x", "Планировки ЖК"),
    ).toBe(true);
    expect(isClientExternalUrl("https://docs.google.com/x", "Шахматка")).toBe(
      true,
    );
    expect(
      isClientExternalUrl("https://docs.google.com/x", "Шахматка", {
        chess: false,
      }),
    ).toBe(false);
    expect(
      isClientExternalUrl("https://docs.google.com/y", "Коммерция 8 марта"),
    ).toBe(true);
    expect(isClientExternalUrl("https://docs.google.com/z", "Прайс")).toBe(
      true,
    );
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
    ).toEqual([
      "https://share.api.2gis.ru/getimage?city=grozny",
      "https://cdn.example/location/01.webp",
    ]);
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
    expect(
      isMissingQuotesColumn({
        code: "PGRST204",
        message: "Could not find the 'quotes' column of 'catalog_shares' in the schema cache",
      }),
    ).toBe(true);
    expect(
      isMissingQuotesColumn({
        code: "23514",
        message:
          'new row for relation "catalog_shares" violates check constraint "catalog_shares_quotes_array"',
      }),
    ).toBe(false);
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
      agent: null,
      properties: [],
    });
    expect(
      parseOpenCatalogShare({
        ok: true,
        title: "Подборка",
        properties: [],
        agent: { name: "Бетербеков Амин", phone: "+7 (967) 956-62-00" },
      }),
    ).toMatchObject({
      ok: true,
      agent: { name: "Бетербеков Амин", whatsapp: "79679566200" },
    });

    const sanitized = parseOpenCatalogShare({
      ok: true,
      title: "Подборка",
      properties: [
        {
          ...property({
            id: "35ab9d42-9bfc-4e86-9da4-814e29f257dd",
            catalog: {
              documents: [
                { title: "План", url: "https://example.com/plan.pdf", kind: "plan" },
                { title: "Шахматка", url: "https://example.com/units.xlsx", kind: "chess" },
              ],
            },
          }),
          internal: { commission: "секрет" },
          assigned_to: "agent-id",
          created_by: "creator-id",
          relevance: 3,
        },
      ],
    });
    expect(sanitized.ok).toBe(true);
    if (sanitized.ok) {
      expect(sanitized.properties[0]?.catalog?.documents).toEqual([
        { title: "План", url: "https://example.com/plan.pdf", kind: "plan" },
      ]);
      expect(sanitized.properties[0]?.internal).toBeUndefined();
      expect(sanitized.properties[0]?.assigned_to).toBeUndefined();
      expect(sanitized.properties[0]?.relevance).toBeNull();
    }
  });

  it("normalizes phones and summarizes guest events", () => {
    expect(phoneToWhatsapp("+7 (967) 956-62-00")).toBe("79679566200");
    expect(phoneToWhatsapp("89679566200")).toBe("79679566200");
    expect(phoneToWhatsapp("12")).toBeNull();
    expect(parseShareAgent({ name: "Амин", phone: "79679566200" })).toEqual({
      name: "Амин",
      whatsapp: "79679566200",
    });
    expect(agentWhatsappUrl({
      whatsapp: "79679566200",
      propertyTitle: "Вулф Тауэрс",
    })).toContain("wa.me/79679566200?text=");

    const stats = summarizeShareEvents(
      [
        {
          share_id: "s1",
          event_type: "open",
          property_id: null,
          visitor_key: "aaaaaaaaaaaaaaaaaaaa",
          created_at: "2026-09-17T10:00:00.000Z",
        },
        {
          share_id: "s1",
          event_type: "view",
          property_id: "p1",
          visitor_key: "aaaaaaaaaaaaaaaaaaaa",
          created_at: "2026-09-17T10:01:00.000Z",
        },
        {
          share_id: "s1",
          event_type: "contact",
          property_id: "p1",
          visitor_key: "aaaaaaaaaaaaaaaaaaaa",
          created_at: "2026-09-17T10:02:00.000Z",
        },
      ],
      { p1: "Вулф Тауэрс" },
    );
    expect(stats.s1).toMatchObject({
      opens: 1,
      views: 1,
      contacts: 1,
    });
    expect(shareStatsLabel(stats.s1)).toBe(
      "открыли 1 · смотрели Вулф Тауэрс · написали 1",
    );
  });
});
