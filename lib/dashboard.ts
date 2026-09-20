import type { Deal } from "@/lib/types";

type DashboardDeal = Pick<
  Deal,
  "stage" | "amount" | "created_at" | "closed_at"
>;

function isOpenDeal(deal: Pick<Deal, "stage">) {
  return deal.stage !== "closed_won" && deal.stage !== "closed_lost";
}

function isSameMonth(value: string | null, year: number, month: number) {
  if (!value) return false;
  const date = new Date(value);
  return (
    !Number.isNaN(date.getTime()) &&
    date.getFullYear() === year &&
    date.getMonth() === month
  );
}

export function pipelineAmount(deals: DashboardDeal[]) {
  return deals
    .filter(isOpenDeal)
    .reduce((sum, deal) => sum + (deal.amount ?? 0), 0);
}

export function wonAmountSince(deals: DashboardDeal[], since: Date) {
  const threshold = since.getTime();
  return deals
    .filter((deal) => {
      if (deal.stage !== "closed_won" || !deal.closed_at) return false;
      const closedAt = new Date(deal.closed_at).getTime();
      return !Number.isNaN(closedAt) && closedAt >= threshold;
    })
    .reduce((sum, deal) => sum + (deal.amount ?? 0), 0);
}

export function computeMonthlyDealValues(
  deals: DashboardDeal[],
  months: number,
  now = new Date(),
) {
  const count = Math.max(1, Math.trunc(months));
  const formatter = new Intl.DateTimeFormat("ru-RU", { month: "short" });
  const result: { month: string; amount: number; won: number }[] = [];

  for (let offset = count - 1; offset >= 0; offset--) {
    const cursor = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    const year = cursor.getFullYear();
    const month = cursor.getMonth();
    result.push({
      month: formatter.format(cursor),
      amount: deals
        .filter(
          (deal) =>
            isOpenDeal(deal) && isSameMonth(deal.created_at, year, month),
        )
        .reduce((sum, deal) => sum + (deal.amount ?? 0), 0),
      won: deals
        .filter(
          (deal) =>
            deal.stage === "closed_won" &&
            isSameMonth(deal.closed_at, year, month),
        )
        .reduce((sum, deal) => sum + (deal.amount ?? 0), 0),
    });
  }

  return result;
}
