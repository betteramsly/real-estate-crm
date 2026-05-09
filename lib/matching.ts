import type { Client, ListingType, Property } from "@/lib/types";

export interface MatchedProperty {
  property: Property;
  score: number;
  reasons: string[];
}

const DEAL_TYPE_TO_LISTING: Record<Client["deal_type"], ListingType | null> = {
  buy: "sale",
  sell: "sale",
  rent_in: "rent",
  rent_out: "rent",
};

/**
 * Подбирает объекты, подходящие клиенту по типу сделки и бюджету.
 * Возвращает отсортированный список с причинами совпадения и баллом.
 *
 * Эта функция чистая (без сетевых вызовов), вызывается на сервере
 * после получения активных объектов из Supabase.
 */
export function matchPropertiesForClient(
  client: Pick<Client, "deal_type" | "budget_min" | "budget_max">,
  properties: Property[],
): MatchedProperty[] {
  const targetListing = DEAL_TYPE_TO_LISTING[client.deal_type];
  if (!targetListing) return [];

  const result: MatchedProperty[] = [];

  for (const property of properties) {
    if (property.status !== "active") continue;
    if (property.listing_type !== targetListing) continue;

    const reasons: string[] = [];
    let score = 0;

    reasons.push(
      targetListing === "sale" ? "тип сделки: продажа" : "тип сделки: аренда",
    );
    score += 1;

    if (client.budget_min !== null && property.price < client.budget_min) {
      continue;
    }
    if (client.budget_max !== null && property.price > client.budget_max) {
      continue;
    }
    if (client.budget_min !== null || client.budget_max !== null) {
      reasons.push("в бюджете");
      score += 2;
    }

    result.push({ property, score, reasons });
  }

  result.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    return a.property.price - b.property.price;
  });

  return result;
}
