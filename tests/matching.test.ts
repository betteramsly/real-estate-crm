import { describe, expect, it } from "vitest";
import { matchPropertiesForClient } from "@/lib/matching";
import type { Client, Property } from "@/lib/types";

function makeProperty(overrides: Partial<Property> = {}): Property {
  return {
    id: overrides.id ?? "p1",
    title: overrides.title ?? "2-комн. в Сокольниках",
    property_type: overrides.property_type ?? "apartment",
    listing_type: overrides.listing_type ?? "sale",
    status: overrides.status ?? "active",
    price: overrides.price ?? 5_000_000,
    area: overrides.area ?? null,
    rooms: overrides.rooms ?? null,
    address: overrides.address ?? null,
    city: overrides.city ?? null,
    district: overrides.district ?? null,
    description: overrides.description ?? null,
    cover_url: overrides.cover_url ?? null,
    assigned_to: overrides.assigned_to ?? null,
    created_by: overrides.created_by ?? null,
    created_at: overrides.created_at ?? "2026-01-01T00:00:00Z",
    updated_at: overrides.updated_at ?? "2026-01-01T00:00:00Z",
  };
}

const baseClient: Pick<Client, "deal_type" | "budget_min" | "budget_max"> = {
  deal_type: "buy",
  budget_min: 4_000_000,
  budget_max: 6_000_000,
};

describe("matchPropertiesForClient", () => {
  it("возвращает только активные объекты", () => {
    const props = [
      makeProperty({ id: "p1", status: "active" }),
      makeProperty({ id: "p2", status: "archived" }),
      makeProperty({ id: "p3", status: "sold" }),
    ];

    const result = matchPropertiesForClient(baseClient, props);

    expect(result.map((m) => m.property.id)).toEqual(["p1"]);
  });

  it("сопоставляет тип сделки клиента с listing_type объекта", () => {
    const props = [
      makeProperty({ id: "p_sale", listing_type: "sale" }),
      makeProperty({ id: "p_rent", listing_type: "rent" }),
    ];

    const buyer = matchPropertiesForClient(
      { ...baseClient, deal_type: "buy" },
      props,
    );
    expect(buyer.map((m) => m.property.id)).toEqual(["p_sale"]);

    const renter = matchPropertiesForClient(
      { ...baseClient, deal_type: "rent_in" },
      props,
    );
    expect(renter.map((m) => m.property.id)).toEqual(["p_rent"]);
  });

  it("отсеивает объекты вне бюджета", () => {
    const props = [
      makeProperty({ id: "cheap", price: 1_000_000 }),
      makeProperty({ id: "ok", price: 5_000_000 }),
      makeProperty({ id: "expensive", price: 9_000_000 }),
    ];

    const result = matchPropertiesForClient(baseClient, props);

    expect(result.map((m) => m.property.id)).toEqual(["ok"]);
  });

  it("игнорирует бюджетные границы, если они null", () => {
    const props = [
      makeProperty({ id: "any", price: 100_000_000 }),
    ];

    const result = matchPropertiesForClient(
      { deal_type: "buy", budget_min: null, budget_max: null },
      props,
    );

    expect(result).toHaveLength(1);
  });

  it("сортирует по убыванию score, затем по возрастанию цены", () => {
    const props = [
      makeProperty({ id: "a", price: 6_000_000 }),
      makeProperty({ id: "b", price: 4_500_000 }),
      makeProperty({ id: "c", price: 5_000_000 }),
    ];

    const result = matchPropertiesForClient(baseClient, props);

    expect(result.map((m) => m.property.id)).toEqual(["b", "c", "a"]);
  });

  it("возвращает пустой массив для типа sell без объектов с такой логикой", () => {
    const props = [makeProperty({ listing_type: "rent", status: "active" })];

    const result = matchPropertiesForClient(
      { ...baseClient, deal_type: "sell" },
      props,
    );

    expect(result).toEqual([]);
  });
});
