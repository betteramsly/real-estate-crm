"use client";

import * as React from "react";
import { useFormState, useFormStatus } from "react-dom";
import { toast } from "sonner";
import { Camera, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { PhoneInput } from "@/components/phone-input";
import {
  type ProfileFormState,
  updateProfileAction,
} from "@/lib/actions/profile";
import { initials } from "@/lib/formatters";
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
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(
    profile.avatar_url,
  );
  const [state, formAction] = useFormState<ProfileFormState, FormData>(
    updateProfileAction,
    {},
  );

  React.useEffect(() => {
    if (state.error) toast.error(state.error);
    if (state.success) toast.success("Профиль сохранён");
  }, [state]);

  return (
    <form action={formAction} encType="multipart/form-data" className="space-y-4">
      <div className="flex flex-col gap-4 rounded-xl border bg-muted/30 p-4 sm:flex-row sm:items-center">
        <Avatar className="h-20 w-20 border">
          {previewUrl ? (
            <AvatarImage src={previewUrl} alt={profile.full_name ?? "Аватар"} />
          ) : null}
          <AvatarFallback className="text-lg">
            {initials(profile.full_name)}
          </AvatarFallback>
        </Avatar>
        <div className="space-y-2">
          <Label htmlFor="avatar" className="text-base">
            Фото профиля
          </Label>
          <p className="text-sm text-muted-foreground">
            Загрузите квадратное изображение до 3 МБ. Оно будет видно в шапке и
            списке команды.
          </p>
          <label className="inline-flex h-9 cursor-pointer items-center justify-center gap-2 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground">
            <Camera className="h-4 w-4" />
            Выбрать фото
            <Input
              id="avatar"
              name="avatar"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/gif"
              className="sr-only"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (!file) return;
                setPreviewUrl(URL.createObjectURL(file));
              }}
            />
          </label>
        </div>
      </div>
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
        <PhoneInput
          id="phone"
          name="phone"
          defaultValue={profile.phone ?? ""}
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
