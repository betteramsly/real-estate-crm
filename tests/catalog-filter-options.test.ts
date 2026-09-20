import { describe, expect, it } from "vitest";
import {
  filterOptionError,
  groupCatalogFilterOptions,
  isFilterExtra,
  mergeFilterOptions,
} from "@/lib/catalog-filter-options";

describe("catalog filter options", () => {
  it("groups saved rows and ignores unknown kinds", () => {
    expect(
      groupCatalogFilterOptions([
        { kind: "city", value: "  Грозный " },
        { kind: "city", value: "Грозный" },
        { kind: "district", value: "Новый район" },
        { kind: "unknown", value: "мимо" },
      ]),
    ).toEqual({
      city: ["Грозный"],
      district: ["Новый район"],
      developer: [],
      completion_year: [],
      installment: [],
    });
  });

  it("merges catalog values with saved extras", () => {
    expect(mergeFilterOptions(["Грозный"], ["Аргун", "Грозный"])).toEqual([
      "Аргун",
      "Грозный",
    ]);
  });

  it("marks only saved extras as removable", () => {
    const extras = groupCatalogFilterOptions([
      { kind: "developer", value: "Фаворит" },
    ]);
    expect(isFilterExtra(extras, "developer", "фаворит")).toBe(true);
    expect(isFilterExtra(extras, "developer", "Триумф")).toBe(false);
  });

  it("rejects empty and oversized values", () => {
    expect(filterOptionError("   ")).toBe("Введите значение");
    expect(filterOptionError("а".repeat(81))).toMatch(/80/);
    expect(filterOptionError("Аргун")).toBeNull();
  });
});
