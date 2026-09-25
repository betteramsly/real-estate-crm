import type { UserRole } from "@/lib/types";

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
