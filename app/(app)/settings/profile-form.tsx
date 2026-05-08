"use client";

import * as React from "react";
import { useFormState, useFormStatus } from "react-dom";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  type ProfileFormState,
  updateProfileAction,
} from "@/lib/actions/profile";
import type { Profile } from "@/lib/types";

interface ProfileFormProps {
  profile: Profile;
  email: string;
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
      Сохранить
    </Button>
  );
}

export function ProfileForm({ profile, email }: ProfileFormProps) {
  const [state, formAction] = useFormState<ProfileFormState, FormData>(
    updateProfileAction,
    {},
  );

  React.useEffect(() => {
    if (state.error) toast.error(state.error);
    if (state.success) toast.success("Профиль сохранён");
  }, [state]);

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-2">
        <Label>Email</Label>
        <Input value={email} disabled />
      </div>
      <div className="space-y-2">
        <Label htmlFor="full_name">ФИО</Label>
        <Input
          id="full_name"
          name="full_name"
          defaultValue={profile.full_name ?? ""}
          required
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="phone">Телефон</Label>
        <Input
          id="phone"
          name="phone"
          defaultValue={profile.phone ?? ""}
          placeholder="+7 (___) ___-__-__"
        />
      </div>
      <div className="space-y-2">
        <Label>Роль</Label>
        <Input value={profile.role === "admin" ? "Админ" : "Агент"} disabled />
      </div>
      <SubmitButton />
    </form>
  );
}
