import { describe, expect, it } from "vitest";
import { computeInsights } from "@/lib/insights";

const NOW = new Date("2026-05-09T00:00:00Z");
const daysAgo = (days: number) =>
  new Date(NOW.getTime() - days * 24 * 60 * 60 * 1000).toISOString();

describe("computeInsights", () => {
  it("возвращает пустой массив, если данных нет", () => {
    const result = computeInsights({
      clients: [],
      deals: [],
      tasks: [],
      now: NOW,
    });
    expect(result).toEqual([]);
  });

  it("находит просроченные задачи", () => {
    const result = computeInsights({
      clients: [],
      deals: [],
      tasks: [
        {
          id: "t1",
          status: "todo",
          client_id: null,
          deal_id: null,
          due_at: daysAgo(3),
        },
      ],
      now: NOW,
    });

    expect(result.find((i) => i.id === "overdue-tasks")).toBeDefined();
  });

  it("находит активных клиентов без открытых задач", () => {
    const result = computeInsights({
      clients: [
        {
          id: "c1",
          full_name: "Иван Иванов",
          status: "in_progress",
          updated_at: daysAgo(1),
        },
      ],
      deals: [],
      tasks: [],
      now: NOW,
    });

    expect(result.find((i) => i.id === "clients-without-task")).toBeDefined();
  });

  it("не показывает клиента, у которого есть открытая задача", () => {
    const result = computeInsights({
      clients: [
        {
          id: "c1",
          full_name: "Иван Иванов",
          status: "in_progress",
          updated_at: daysAgo(1),
        },
      ],
      deals: [],
      tasks: [
        {
          id: "t1",
          status: "todo",
          client_id: "c1",
          deal_id: null,
          due_at: null,
        },
      ],
      now: NOW,
    });

    expect(result.find((i) => i.id === "clients-without-task")).toBeUndefined();
  });

  it("находит сделки без движения 7+ дней", () => {
    const result = computeInsights({
      clients: [],
      deals: [
        {
          id: "d1",
          title: "Сделка",
          stage: "negotiation",
          updated_at: daysAgo(10),
          expected_close_date: "2026-06-01",
        },
      ],
      tasks: [],
      now: NOW,
    });

    expect(result.find((i) => i.id === "stale-deals")).toBeDefined();
  });

  it("игнорирует закрытые сделки в проверке staleness", () => {
    const result = computeInsights({
      clients: [],
      deals: [
        {
          id: "d1",
          title: "Сделка",
          stage: "closed_won",
          updated_at: daysAgo(60),
          expected_close_date: null,
        },
      ],
      tasks: [],
      now: NOW,
    });

    expect(result.find((i) => i.id === "stale-deals")).toBeUndefined();
  });

  it("находит сделки на финальной стадии без даты закрытия", () => {
    const result = computeInsights({
      clients: [],
      deals: [
        {
          id: "d1",
          title: "Договор",
          stage: "contract",
          updated_at: NOW.toISOString(),
          expected_close_date: null,
        },
      ],
      tasks: [],
      now: NOW,
    });

    expect(result.find((i) => i.id === "deals-no-close-date")).toBeDefined();
  });
});
