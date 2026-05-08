"use client";

import * as React from "react";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { setUserRoleAction } from "@/lib/actions/profile";
import type { UserRole } from "@/lib/types";

interface RoleSelectProps {
  userId: string;
  role: UserRole;
  disabled?: boolean;
}

export function RoleSelect({ userId, role, disabled }: RoleSelectProps) {
  const [pending, start] = React.useTransition();
  const [value, setValue] = React.useState<UserRole>(role);

  const handleChange = (next: string) => {
    const role = next as UserRole;
    setValue(role);
    start(async () => {
      try {
        await setUserRoleAction(userId, role);
        toast.success("Роль обновлена");
      } catch (e) {
        toast.error((e as Error).message);
      }
    });
  };

  return (
    <Select
      value={value}
      onValueChange={handleChange}
      disabled={disabled || pending}
    >
      <SelectTrigger className="w-32">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="agent">Агент</SelectItem>
        <SelectItem value="admin">Админ</SelectItem>
      </SelectContent>
    </Select>
  );
}
