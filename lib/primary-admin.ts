import type { UserRole } from "@/lib/types";

export const PRIMARY_ADMIN_EMAIL = "admin@demo.local";

export function isPrimaryAdminEmail(email?: string | null) {
  return email?.trim().toLowerCase() === PRIMARY_ADMIN_EMAIL;
}

export function canChangeUserRole(input: {
  actorId: string;
  actorRole: UserRole;
  targetId: string;
  targetEmail?: string | null;
}) {
  if (input.actorRole !== "admin") return false;
  if (input.actorId === input.targetId) return false;
  if (isPrimaryAdminEmail(input.targetEmail)) return false;
  return true;
}
