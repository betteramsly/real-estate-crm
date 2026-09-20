import { describe, expect, it } from "vitest";
import { normalizeSearchTerm } from "@/lib/search";

describe("normalizeSearchTerm", () => {
  it("keeps normal CRM search values", () => {
    expect(normalizeSearchTerm("  Иван +7 999 user@example.com ")).toBe(
      "Иван +7 999 user@example.com",
    );
  });

  it("removes PostgREST filter grammar", () => {
    expect(normalizeSearchTerm("x),status.eq.won,(y%_")).toBe(
      "x status.eq.won y",
    );
  });
});
