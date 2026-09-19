import { describe, expect, it } from "vitest";
import { PROPERTY_PUBLIC_COLUMNS } from "@/lib/catalog";
import {
  canReopenPropertyFeedback,
  canResolvePropertyFeedback,
  canShowPropertyFeedback,
  clipPropertyFeedbackBody,
  isPropertyFeedbackStatus,
  parseTeamFeedbackFilter,
  teamFeedbackFilterHref,
  teamFeedbackStatusesForFilter,
  teamInboxHref,
  validatePropertyFeedbackBody,
} from "@/lib/property-feedback";

describe("property feedback visibility", () => {
  it("hides the button in present mode and on share pages", () => {
    expect(canShowPropertyFeedback()).toBe(true);
    expect(canShowPropertyFeedback({ presentMode: false, isShare: false })).toBe(
      true,
    );
    expect(canShowPropertyFeedback({ presentMode: true })).toBe(false);
    expect(canShowPropertyFeedback({ isShare: true })).toBe(false);
    expect(
      canShowPropertyFeedback({ presentMode: true, isShare: true }),
    ).toBe(false);
  });

  it("keeps feedback out of public catalog columns", () => {
    expect(PROPERTY_PUBLIC_COLUMNS).not.toMatch(/feedback|internal/);
  });
});

describe("property feedback body", () => {
  it("requires 20 to 1000 trimmed characters", () => {
    expect(validatePropertyFeedbackBody("   коротко   ").ok).toBe(false);
    expect(validatePropertyFeedbackBody("а".repeat(19)).ok).toBe(false);
    expect(validatePropertyFeedbackBody("а".repeat(20))).toEqual({
      ok: true,
      body: "а".repeat(20),
    });
    expect(validatePropertyFeedbackBody(`  ${"б".repeat(1000)}  `)).toEqual({
      ok: true,
      body: "б".repeat(1000),
    });
    expect(validatePropertyFeedbackBody("в".repeat(1001)).ok).toBe(false);
  });

  it("clips inbox text without breaking the card", () => {
    expect(clipPropertyFeedbackBody("Нет прайса в карточке")).toBe(
      "Нет прайса в карточке",
    );
    expect(clipPropertyFeedbackBody("слово ".repeat(40), 24)).toMatch(/…$/);
    expect(clipPropertyFeedbackBody("слово ".repeat(40), 24).length).toBeLessThanOrEqual(
      24,
    );
  });
});

describe("property feedback status helpers", () => {
  it("accepts only known statuses", () => {
    expect(isPropertyFeedbackStatus("open")).toBe(true);
    expect(isPropertyFeedbackStatus("done")).toBe(true);
    expect(isPropertyFeedbackStatus("tasked")).toBe(true);
    expect(isPropertyFeedbackStatus("closed")).toBe(false);
  });

  it("treats anything except done as not done", () => {
    expect(canResolvePropertyFeedback("open")).toBe(true);
    expect(canResolvePropertyFeedback("tasked")).toBe(true);
    expect(canResolvePropertyFeedback("done")).toBe(false);
    expect(canReopenPropertyFeedback("done")).toBe(true);
    expect(canReopenPropertyFeedback("open")).toBe(false);
    expect(canReopenPropertyFeedback("tasked")).toBe(false);
  });
});

describe("team feedback tabs", () => {
  it("keeps only done and not-done tabs", () => {
    expect(parseTeamFeedbackFilter(undefined)).toBe("open");
    expect(parseTeamFeedbackFilter("done")).toBe("done");
    expect(parseTeamFeedbackFilter("tasked")).toBe("open");
    expect(parseTeamFeedbackFilter("all")).toBe("open");
    expect(teamFeedbackStatusesForFilter("open")).toEqual(["open", "tasked"]);
    expect(teamFeedbackStatusesForFilter("done")).toEqual(["done"]);
    expect(
      teamFeedbackFilterHref("11111111-1111-4111-8111-111111111111", "open"),
    ).toBe("/team/11111111-1111-4111-8111-111111111111");
    expect(
      teamFeedbackFilterHref("11111111-1111-4111-8111-111111111111", "done"),
    ).toBe("/team/11111111-1111-4111-8111-111111111111?status=done");
    expect(teamInboxHref("open")).toBe("/team");
    expect(teamInboxHref("done")).toBe("/team?status=done");
  });
});
