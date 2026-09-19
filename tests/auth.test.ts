import { describe, expect, it } from "vitest";
import {
  canChangeUserRole,
  isPrimaryAdminEmail,
  PRIMARY_ADMIN_EMAIL,
} from "@/lib/primary-admin";

describe("primary admin lock", () => {
  it("recognizes the owner email", () => {
    expect(isPrimaryAdminEmail(PRIMARY_ADMIN_EMAIL)).toBe(true);
    expect(isPrimaryAdminEmail("  Admin@Demo.Local  ")).toBe(true);
    expect(isPrimaryAdminEmail("gazaloev@mail.ru")).toBe(false);
    expect(isPrimaryAdminEmail(null)).toBe(false);
  });

  it("hides role changes for the owner and for self", () => {
    expect(
      canChangeUserRole({
        actorId: "other-admin",
        actorRole: "admin",
        targetId: "owner",
        targetEmail: PRIMARY_ADMIN_EMAIL,
      }),
    ).toBe(false);
    expect(
      canChangeUserRole({
        actorId: "admin-1",
        actorRole: "admin",
        targetId: "admin-1",
        targetEmail: "other@demo.local",
      }),
    ).toBe(false);
    expect(
      canChangeUserRole({
        actorId: "agent-1",
        actorRole: "agent",
        targetId: "other",
        targetEmail: "other@demo.local",
      }),
    ).toBe(false);
    expect(
      canChangeUserRole({
        actorId: "other-admin",
        actorRole: "admin",
        targetId: "agent-1",
        targetEmail: "agent@demo.local",
      }),
    ).toBe(true);
  });
});
