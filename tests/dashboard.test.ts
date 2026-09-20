import { describe, expect, it } from "vitest";
import {
  computeMonthlyDealValues,
  pipelineAmount,
  wonAmountSince,
} from "@/lib/dashboard";
import type { Deal } from "@/lib/types";

type DashboardDeal = Pick<
  Deal,
  "stage" | "amount" | "created_at" | "closed_at"
>;

const deals: DashboardDeal[] = [
  {
    stage: "negotiation",
    amount: 10_000_000,
    created_at: "2025-01-10T10:00:00Z",
    closed_at: null,
  },
  {
    stage: "closed_won",
    amount: 7_000_000,
    created_at: "2025-01-10T10:00:00Z",
    closed_at: "2026-09-05T10:00:00Z",
  },
  {
    stage: "closed_lost",
    amount: 4_000_000,
    created_at: "2026-09-02T10:00:00Z",
    closed_at: "2026-09-06T10:00:00Z",
  },
];

describe("dashboard deal metrics", () => {
  it("keeps old active deals in the current pipeline", () => {
    expect(pipelineAmount(deals)).toBe(10_000_000);
  });

  it("uses the real close date for recent won revenue", () => {
    expect(wonAmountSince(deals, new Date("2026-09-01T00:00:00Z"))).toBe(
      7_000_000,
    );
    expect(wonAmountSince(deals, new Date("2026-09-10T00:00:00Z"))).toBe(0);
  });

  it("groups won deals by close month instead of creation month", () => {
    const monthly = computeMonthlyDealValues(
      deals,
      2,
      new Date("2026-09-21T12:00:00Z"),
    );
    expect(monthly.at(-1)).toMatchObject({ amount: 0, won: 7_000_000 });
  });
});
