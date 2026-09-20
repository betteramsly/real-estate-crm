"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireProfile } from "@/lib/auth";
import { canChangeUserRole, isPrimaryAdminEmail } from "@/lib/primary-admin";
import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/lib/types";

const profileSchema = z.object({
  full_name: z.string().min(2, "Минимум 2 символа"),
  phone: z.string().nullable().optional(),
});

const AVATAR_MIME_BY_EXT: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
};

const AVATAR_MIME_ALIASES: Record<string, string> = {
  "image/jpg": "image/jpeg",
  "image/pjpeg": "image/jpeg",
  "image/x-png": "image/png",
};

const AVATAR_MAX_BYTES = 3 * 1024 * 1024;

export type ProfileFormState = {
  error?: string;
  success?: boolean;
  avatarUrl?: string | null;
};

function avatarExtension(file: File) {
  const fromName = file.name.split(".").pop()?.toLowerCase() ?? "";
  if (fromName in AVATAR_MIME_BY_EXT) return fromName;
  const mime = normalizeAvatarMime(file.type);
  if (mime === "image/png") return "png";
  if (mime === "image/webp") return "webp";
  if (mime === "image/gif") return "gif";
  return "jpg";
}

function normalizeAvatarMime(raw: string) {
  const type = raw.trim().toLowerCase();
  if (!type) return "";
  return AVATAR_MIME_ALIASES[type] ?? type;
}

function resolveAvatarMime(file: File) {
  const fromType = normalizeAvatarMime(file.type);
  if (fromType && Object.values(AVATAR_MIME_BY_EXT).includes(fromType)) {
    return fromType;
  }
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
  return AVATAR_MIME_BY_EXT[ext] ?? "";
}

function isAvatarFile(value: FormDataEntryValue | null): value is File {
  return typeof File !== "undefined" && value instanceof File && value.size > 0;
}

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
    return {
      error: parsed.error.issues[0]?.message ?? "Ошибка валидации",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Не авторизован" };

  const avatarFile = formData.get("avatar");
  let avatarUrl: string | null = null;

  if (isAvatarFile(avatarFile)) {
    const mime = resolveAvatarMime(avatarFile);
    if (!mime) {
      return {
        error:
          "Можно загрузить JPG, PNG, WebP или GIF. HEIC с iPhone сохраните как JPG.",
      };
    }

    if (avatarFile.size > AVATAR_MAX_BYTES) {
      return { error: "Размер изображения должен быть меньше 3 МБ" };
    }

    const extension = avatarExtension(avatarFile);
    const filePath = `${user.id}/avatar-${Date.now()}.${extension}`;
    const buffer = Buffer.from(await avatarFile.arrayBuffer());

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(filePath, buffer, {
        contentType: mime,
        upsert: true,
        cacheControl: "3600",
      });

    if (uploadError) {
      return {
        error: uploadError.message || "Не удалось загрузить фото",
      };
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
  return { success: true, avatarUrl };
}

export async function setUserRoleAction(userId: string, role: UserRole) {
  const { supabase, profile, user } = await requireProfile();
  if (role !== "admin" && role !== "agent") {
    throw new Error("Неизвестная роль");
  }

  const { data: target, error: targetError } = await supabase
    .from("profiles")
    .select("id, email")
    .eq("id", userId)
    .maybeSingle<{ id: string; email: string | null }>();

  if (targetError || !target) {
    throw new Error("Пользователь не найден");
  }

  if (
    !canChangeUserRole({
      actorId: user.id,
      actorRole: profile.role,
      targetId: target.id,
      targetEmail: target.email,
    })
  ) {
    if (userId === user.id) {
      throw new Error("Нельзя сменить свою роль");
    }
    if (isPrimaryAdminEmail(target.email)) {
      throw new Error("Нельзя менять роль главного администратора");
    }
    throw new Error("Только администратор может менять роли");
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
    return {
      error: parsed.error.issues[0]?.message ?? "Ошибка валидации",
    };
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
