"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/lib/types";

const profileSchema = z.object({
  full_name: z.string().min(2, "Минимум 2 символа"),
  phone: z.string().nullable().optional(),
});

export type ProfileFormState = {
  error?: string;
  success?: boolean;
};

export async function updateProfileAction(
  _prev: ProfileFormState,
  formData: FormData,
): Promise<ProfileFormState> {
  const phone = formData.get("phone");
  const phoneValue = typeof phone === "string" ? phone : null;
  const phoneDigits = phoneValue?.replace(/\D/g, "") ?? "";

  const parsed = profileSchema.safeParse({
    full_name: formData.get("full_name"),
    phone: phoneDigits.length > 1 ? phoneValue : null,
  });

  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Ошибка валидации" };
  }

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Не авторизован" };

  const avatarFile = formData.get("avatar");
  let avatarUrl: string | null = null;

  if (avatarFile instanceof File && avatarFile.size > 0) {
    const allowedMimeTypes = ["image/jpeg", "image/png", "image/webp", "image/gif"];

    if (!allowedMimeTypes.includes(avatarFile.type)) {
      return { error: "Можно загрузить JPG, PNG, WebP или GIF" };
    }

    const maxSize = 3 * 1024 * 1024;
    if (avatarFile.size > maxSize) {
      return { error: "Размер изображения должен быть меньше 3 МБ" };
    }

    const extension = avatarFile.name.split(".").pop()?.toLowerCase() ?? "jpg";
    const filePath = `${user.id}/avatar-${Date.now()}.${extension}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(filePath, avatarFile, {
        contentType: avatarFile.type,
        upsert: true,
      });

    if (uploadError) {
      return { error: uploadError.message };
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("avatars").getPublicUrl(filePath);

    avatarUrl = publicUrl;
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      full_name: parsed.data.full_name,
      phone: parsed.data.phone || null,
      ...(avatarUrl ? { avatar_url: avatarUrl } : {}),
    })
    .eq("id", user.id);

  if (error) return { error: error.message };

  revalidatePath("/settings");
  revalidatePath("/", "layout");
  return { success: true };
}

export async function setUserRoleAction(userId: string, role: UserRole) {
  const { supabase, profile, user } = await requireProfile();
  if (profile.role !== "admin") {
    throw new Error("Только администратор может менять роли");
  }
  if (userId === user.id) {
    throw new Error("Нельзя сменить свою роль");
  }
  if (role !== "admin" && role !== "agent") {
    throw new Error("Неизвестная роль");
  }

  const { error } = await supabase
    .from("profiles")
    .update({ role })
    .eq("id", userId);

  if (error) throw new Error(error.message);

  revalidatePath("/team");
}

const agentSchema = z.object({
  full_name: z.string().min(2, "Минимум 2 символа"),
  email: z.string().email("Введите корректный email"),
  password: z.string().min(8, "Минимум 8 символов"),
});

export type CreateAgentState = {
  error?: string;
  success?: boolean;
};

export async function createAgentAction(
  _prev: CreateAgentState,
  formData: FormData,
): Promise<CreateAgentState> {
  const { supabase, profile } = await requireProfile();
  if (profile.role !== "admin") {
    return { error: "Только администратор может добавлять агентов" };
  }

  const parsed = agentSchema.safeParse({
    full_name: formData.get("full_name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Ошибка валидации" };
  }

  const { error } = await supabase.rpc("create_team_agent", {
    agent_email: parsed.data.email,
    agent_password: parsed.data.password,
    agent_name: parsed.data.full_name,
  });

  if (error) {
    return { error: error.message || "Не удалось создать агента" };
  }

  revalidatePath("/team");
  return { success: true };
}
