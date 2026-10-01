import type { UserRole } from "@/lib/types";

export const USER_ROLES: UserRole[] = ["agent", "admin", "rop", "manager"];

export const USER_ROLE_LABELS: Record<UserRole, string> = {
  agent: "Агент",
  admin: "Администратор",
  rop: "РОП",
  manager: "Руководитель",
};

export function isUserRole(value: string): value is UserRole {
  return USER_ROLES.includes(value as UserRole);
}

export function canViewCompanyAnalytics(role: UserRole, isOwner = false) {
  return isOwner || role === "rop" || role === "manager";
}

export function canAssignWork(role: UserRole, isOwner = false) {
  return canViewCompanyAnalytics(role, isOwner);
}

export function canChangeUserRole(input: {
  actorId: string;
  actorRole: UserRole;
  targetId: string;
  targetIsOwner: boolean;
}) {
  return (
    input.actorRole === "admin" &&
    input.actorId !== input.targetId &&
    !input.targetIsOwner
  );
}
