import { describe, expect, it } from "vitest";
import {
  analyticsPeriodStart,
  calculateRealtorEarnings,
  computeCompanyAnalytics,
  resolveAnalyticsDateRange,
  resolveAnalyticsPeriod,
} from "@/lib/analytics";

const now = new Date("2026-09-30T12:00:00+03:00");

describe("company analytics", () => {
  it("resolves supported periods and defaults safely", () => {
    expect(resolveAnalyticsPeriod("90d")).toBe("90d");
    expect(resolveAnalyticsPeriod("invalid")).toBe("30d");
    expect(analyticsPeriodStart("30d", now).getDate()).toBe(1);
  });

  it("resolves an inclusive custom date range", () => {
    const range = resolveAnalyticsDateRange(
      {
        period: "custom",
        from: "2026-09-10",
        to: "2026-09-20",
      },
      now,
    );

    expect(range.selection).toBe("custom");
    expect(range.from).toBe("2026-09-10");
    expect(range.to).toBe("2026-09-20");
    expect(range.start.getHours()).toBe(0);
    expect(range.end.getHours()).toBe(23);
    expect(range.end.getMinutes()).toBe(59);
    expect(range.end.getMilliseconds()).toBe(999);
  });

  it("falls back to 30 days for an invalid custom range", () => {
    const range = resolveAnalyticsDateRange(
      {
        period: "custom",
        from: "2026-09-20",
        to: "2026-09-10",
      },
      now,
    );

    expect(range.selection).toBe("30d");
    expect(range.end).toEqual(now);
  });

  it("deducts the company percentage from realtor earnings", () => {
    const result = computeCompanyAnalytics({
      period: "30d",
      now,
      profiles: [
        {
          id: "agent-1",
          full_name: "Иван",
          role: "agent",
          company_commission_percent: 20,
        },
      ],
      clients: [
        {
          id: "client-1",
          full_name: "Клиент",
          status: "won",
          assigned_to: "agent-1",
          created_at: "2026-09-03T09:00:00Z",
        },
      ],
      deals: [
        {
          id: "deal-1",
          title: "Сделка",
          stage: "closed_won",
          amount: 10_000_000,
          commission: 300_000,
          assigned_to: "agent-1",
          created_at: "2026-09-03T09:00:00Z",
          closed_at: "2026-09-20T09:00:00Z",
          expected_close_date: "2026-09-20",
        },
        {
          id: "deal-2",
          title: "Потеря",
          stage: "closed_lost",
          amount: 5_000_000,
          commission: 150_000,
          assigned_to: "agent-1",
          created_at: "2026-09-04T09:00:00Z",
          closed_at: "2026-09-21T09:00:00Z",
          expected_close_date: "2026-09-21",
        },
      ],
      tasks: [],
    });

    expect(result.grossVolume).toBe(10_000_000);
    expect(result.realtorEarnings).toBe(240_000);
    expect(result.conversionRate).toBe(50);
    expect(result.team[0]).toMatchObject({
      name: "Иван",
      grossVolume: 10_000_000,
      companyCommissionPercent: 20,
      realtorEarnings: 240_000,
      wonDeals: 1,
    });
    expect(
      result.financialTrend.reduce(
        (sum, row) => sum + row.realtorEarnings,
        0,
      ),
    ).toBe(240_000);
  });

  it("rounds realtor earnings to kopecks", () => {
    expect(calculateRealtorEarnings(1000, 33.33)).toBe(666.7);
  });

  it("handles the boundary company percentages", () => {
    expect(calculateRealtorEarnings(300_000, 0)).toBe(300_000);
    expect(calculateRealtorEarnings(300_000, 100)).toBe(0);
  });

  it("keeps current pipeline and overdue tasks as live snapshots", () => {
    const result = computeCompanyAnalytics({
      period: "30d",
      now,
      profiles: [],
      clients: [],
      deals: [
        {
          id: "old-deal",
          title: "Старая активная сделка",
          stage: "negotiation",
          amount: 2_000_000,
          commission: 100_000,
          assigned_to: null,
          created_at: "2025-01-01T00:00:00Z",
          closed_at: null,
          expected_close_date: "2026-10-10",
        },
      ],
      tasks: [
        {
          id: "task-1",
          title: "Просроченная задача",
          status: "todo",
          priority: "high",
          due_at: "2026-09-20T09:00:00Z",
          assigned_to: null,
          created_at: "2025-01-01T00:00:00Z",
        },
      ],
    });

    expect(result.dealsCreated).toBe(0);
    expect(result.currentPipelineAmount).toBe(2_000_000);
    expect(result.overdueTasks).toBe(1);
    expect(result.team[0]?.name).toBe("Без ответственного");
  });

  it("includes the complete final day of a custom range", () => {
    const periodStart = new Date(2026, 8, 10);
    const periodEnd = new Date(2026, 8, 20, 23, 59, 59, 999);
    const result = computeCompanyAnalytics({
      period: "30d",
      periodStart,
      periodEnd,
      now,
      profiles: [],
      clients: [
        {
          id: "inside",
          full_name: "В границах",
          status: "new",
          assigned_to: null,
          created_at: new Date(2026, 8, 20, 22).toISOString(),
        },
        {
          id: "outside",
          full_name: "За границами",
          status: "new",
          assigned_to: null,
          created_at: new Date(2026, 8, 21).toISOString(),
        },
      ],
      deals: [],
      tasks: [],
    });

    expect(result.clientsCreated).toBe(1);
    expect(result.periodStart).toEqual(periodStart);
    expect(result.periodEnd).toEqual(periodEnd);
  });
});
