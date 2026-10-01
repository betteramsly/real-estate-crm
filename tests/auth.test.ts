import { describe, expect, it } from "vitest";
import {
  canAssignWork,
  canChangeUserRole,
  canViewCompanyAnalytics,
  isUserRole,
} from "@/lib/role-management";

describe("role management", () => {
  it("keeps company-wide analytics limited to leadership and the owner", () => {
    expect(canViewCompanyAnalytics("rop")).toBe(true);
    expect(canViewCompanyAnalytics("manager")).toBe(true);
    expect(canViewCompanyAnalytics("admin")).toBe(false);
    expect(canViewCompanyAnalytics("agent")).toBe(false);
    expect(canViewCompanyAnalytics("admin", true)).toBe(true);
    expect(canAssignWork("rop")).toBe(true);
    expect(canAssignWork("admin")).toBe(false);
    expect(canAssignWork("admin", true)).toBe(true);
  });

  it("recognizes every supported role", () => {
    expect(["agent", "admin", "rop", "manager"].every(isUserRole)).toBe(true);
    expect(isUserRole("owner")).toBe(false);
  });

  it("allows admins to change another non-owner user's role", () => {
    expect(
      canChangeUserRole({
        actorId: "other-admin",
        actorRole: "admin",
        targetId: "agent-1",
        targetIsOwner: false,
      }),
    ).toBe(true);
  });

  it("protects the company owner from role changes", () => {
    expect(
      canChangeUserRole({
        actorId: "other-admin",
        actorRole: "admin",
        targetId: "owner",
        targetIsOwner: true,
      }),
    ).toBe(false);
  });

  it("prevents self-service and non-admin role changes", () => {
    expect(
      canChangeUserRole({
        actorId: "admin-1",
        actorRole: "admin",
        targetId: "admin-1",
        targetIsOwner: false,
      }),
    ).toBe(false);
    expect(
      canChangeUserRole({
        actorId: "agent-1",
        actorRole: "agent",
        targetId: "other",
        targetIsOwner: false,
      }),
    ).toBe(false);
    expect(
      canChangeUserRole({
        actorId: "other-admin",
        actorRole: "admin",
        targetId: "agent-1",
        targetIsOwner: false,
      }),
    ).toBe(true);
  });
});
