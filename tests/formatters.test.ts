import { describe, expect, it } from "vitest";
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatNumber,
  formatRelative,
} from "@/lib/formatters";

describe("formatters", () => {
  it("does not render invalid numeric values", () => {
    expect(formatCurrency(Infinity)).toBe("—");
    expect(formatNumber(Number.NaN)).toBe("—");
  });

  it("does not throw for corrupted dates", () => {
    expect(formatDate("not-a-date")).toBe("—");
    expect(formatDateTime("not-a-date")).toBe("—");
    expect(formatRelative("not-a-date")).toBe("—");
  });
});
