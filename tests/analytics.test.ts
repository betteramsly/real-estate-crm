import { describe, expect, it } from "vitest";
import {
  analyticsPeriodStart,
  computeCompanyAnalytics,
  resolveAnalyticsPeriod,
} from "@/lib/analytics";

const now = new Date("2026-09-30T12:00:00+03:00");

describe("company analytics", () => {
  it("resolves supported periods and defaults safely", () => {
    expect(resolveAnalyticsPeriod("90d")).toBe("90d");
    expect(resolveAnalyticsPeriod("invalid")).toBe("30d");
    expect(analyticsPeriodStart("30d", now).getDate()).toBe(1);
  });

  it("separates gross deal volume from company commission", () => {
    const result = computeCompanyAnalytics({
      period: "30d",
      now,
      profiles: [{ id: "agent-1", full_name: "Иван", role: "agent" }],
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
    expect(result.companyRevenue).toBe(300_000);
    expect(result.conversionRate).toBe(50);
    expect(result.team[0]).toMatchObject({
      name: "Иван",
      grossVolume: 10_000_000,
      companyRevenue: 300_000,
      wonDeals: 1,
    });
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
});
