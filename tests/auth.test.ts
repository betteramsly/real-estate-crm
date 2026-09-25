import { describe, expect, it } from "vitest";
import { canChangeUserRole } from "@/lib/role-management";

describe("role management", () => {
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
