import { describe, expect, it } from "vitest";
import {
  parseDateTimeFormValue,
  parseNumericFormValue,
  parseStringFormValue,
} from "@/lib/parse";

describe("parseNumericFormValue", () => {
  it("возвращает null для пустых значений", () => {
    expect(parseNumericFormValue(null)).toBeNull();
    expect(parseNumericFormValue("")).toBeNull();
  });

  it("корректно парсит число с пробелами", () => {
    expect(parseNumericFormValue("1 250 000")).toBe(1250000);
    expect(parseNumericFormValue("1\u00A0250\u00A0000")).toBe(1250000);
  });

  it("парсит обычные числа", () => {
    expect(parseNumericFormValue("42")).toBe(42);
    expect(parseNumericFormValue("0")).toBe(0);
  });

  it("возвращает null для нечисловых значений", () => {
    expect(parseNumericFormValue("abc")).toBeNull();
    expect(parseNumericFormValue("12abc")).toBeNull();
    expect(parseNumericFormValue("1e999")).toBeNull();
  });
});

describe("parseStringFormValue", () => {
  it("возвращает строку для непустых значений", () => {
    expect(parseStringFormValue("hello")).toBe("hello");
    expect(parseStringFormValue("  hello  ")).toBe("hello");
  });

  it("возвращает null для пустых и nullish значений", () => {
    expect(parseStringFormValue("")).toBeNull();
    expect(parseStringFormValue(null)).toBeNull();
  });
});

describe("parseDateTimeFormValue", () => {
  it("converts a browser datetime-local value to ISO", () => {
    expect(parseDateTimeFormValue("2026-09-21T12:30", -180)).toBe(
      "2026-09-21T09:30:00.000Z",
    );
  });

  it("does not throw for invalid input", () => {
    expect(parseDateTimeFormValue("not-a-date")).toBe("not-a-date");
    expect(parseDateTimeFormValue("2026-02-30T10:00")).toBe(
      "2026-02-30T10:00",
    );
    expect(parseDateTimeFormValue(" ")).toBeNull();
  });
});
