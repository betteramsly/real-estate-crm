"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireProfile } from "@/lib/auth";
import { logActivity } from "@/lib/activities";
import { parseNumericFormValue, parseStringFormValue } from "@/lib/parse";
import { diffRecords } from "@/lib/diff";

const uuidSchema = z.string().uuid();

const clientSchema = z
  .object({
    full_name: z.string().trim().min(2, "Минимум 2 символа").max(160),
    phone: z.string().max(40).nullable().optional(),
    email: z
      .string()
      .trim()
      .max(254)
      .email("Некорректный email")
      .nullable()
      .or(z.literal(""))
      .optional(),
    source: z.enum(["referral", "cian", "avito", "instagram", "other"]),
    status: z.enum(["new", "in_progress", "won", "lost"]),
    deal_type: z.enum(["buy", "sell", "rent_in", "rent_out"]),
    budget_min: z
      .number()
      .nonnegative("Бюджет не может быть отрицательным")
      .nullable()
      .optional(),
    budget_max: z
      .number()
      .nonnegative("Бюджет не может быть отрицательным")
      .nullable()
      .optional(),
    notes: z.string().max(5000).nullable().optional(),
    assigned_to: z.string().uuid().nullable().optional(),
  })
  .superRefine((data, ctx) => {
    if (
      data.budget_min != null &&
      data.budget_max != null &&
      data.budget_min > data.budget_max
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["budget_max"],
        message: "Максимальный бюджет должен быть не меньше минимального",
      });
    }
  });

export type ClientFormState = {
  error?: string;
  success?: boolean;
  fieldErrors?: Record<string, string>;
};

function parseFormData(formData: FormData) {
  const get = (k: string) => formData.get(k);
  const num = (k: string) => parseNumericFormValue(get(k));
  const str = (k: string) => parseStringFormValue(get(k));
  const phone = () => {
    const value = str("phone");
    const digits = value?.replace(/\D/g, "") ?? "";
    return digits.length > 1 ? value : null;
  };

  return {
    full_name: str("full_name") ?? "",
    phone: phone(),
    email: str("email"),
    source: (get("source") as string) ?? "other",
    status: (get("status") as string) ?? "new",
    deal_type: (get("deal_type") as string) ?? "buy",
    budget_min: num("budget_min"),
    budget_max: num("budget_max"),
    notes: str("notes"),
    assigned_to: str("assigned_to"),
  };
}

export async function createClientAction(
  _prev: ClientFormState,
  formData: FormData,
): Promise<ClientFormState> {
  const data = parseFormData(formData);
  const parsed = clientSchema.safeParse(data);
  if (!parsed.success) {
    return {
      error: "Проверьте поля формы",
      fieldErrors: Object.fromEntries(
        parsed.error.errors.map((e) => [e.path.join("."), e.message]),
      ),
    };
  }

  const { supabase, user, profile } = await requireProfile();
  const assignedTo =
    profile.role === "admin" ? (parsed.data.assigned_to ?? user.id) : user.id;

  const { data: created, error } = await supabase
    .from("clients")
    .insert({
      ...parsed.data,
      email: parsed.data.email || null,
      assigned_to: assignedTo,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error || !created) return { error: "Не удалось создать клиента" };

  await logActivity({
    entityType: "client",
    entityId: created.id,
    type: "created",
    payload: { full_name: parsed.data.full_name, status: parsed.data.status },
    clientId: created.id,
  });

  revalidatePath("/clients");
  redirect(`/clients/${created.id}?created=client`);
}

export async function updateClientAction(
  id: string,
  _prev: ClientFormState,
  formData: FormData,
): Promise<ClientFormState> {
  if (!uuidSchema.safeParse(id).success) {
    return { error: "Клиент не найден" };
  }
  const data = parseFormData(formData);
  const parsed = clientSchema.safeParse(data);
  if (!parsed.success) {
    return {
      error: "Проверьте поля формы",
      fieldErrors: Object.fromEntries(
        parsed.error.errors.map((e) => [e.path.join("."), e.message]),
      ),
    };
  }

  const { supabase, profile } = await requireProfile();

  const { data: existing, error: existingError } = await supabase
    .from("clients")
    .select("status, full_name, deal_type, assigned_to, budget_min, budget_max")
    .eq("id", id)
    .maybeSingle();
  if (existingError || !existing) {
    return { error: "Клиент не найден или недоступен" };
  }

  const { data: updated, error } = await supabase
    .from("clients")
    .update({
      ...parsed.data,
      email: parsed.data.email || null,
      assigned_to:
        profile.role === "admin"
          ? (parsed.data.assigned_to ?? null)
          : existing.assigned_to,
    })
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error || !updated) {
    return { error: error?.message ?? "Не удалось сохранить клиента" };
  }

  const changes = diffRecords(existing, parsed.data, [
    "status",
    "full_name",
    "deal_type",
    "assigned_to",
    "budget_min",
    "budget_max",
  ]);
  if (Object.keys(changes).length > 0) {
    const isStatusChange =
      Object.keys(changes).length === 1 && "status" in changes;
    await logActivity({
      entityType: "client",
      entityId: id,
      type: isStatusChange ? "status_changed" : "updated",
      payload: { changes },
      clientId: id,
    });
  }

  revalidatePath("/clients");
  revalidatePath(`/clients/${id}`);
  return { success: true };
}

export async function deleteClientAction(id: string) {
  if (!uuidSchema.safeParse(id).success) {
    throw new Error("Клиент не найден");
  }
  const { supabase } = await requireProfile();
  const { data: deleted, error } = await supabase
    .from("clients")
    .delete()
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error || !deleted) {
    throw new Error(error?.message ?? "Клиент не найден или недоступен");
  }
  await logActivity({
    entityType: "client",
    entityId: id,
    type: "deleted",
    clientId: null,
  });
  revalidatePath("/clients");
  redirect("/clients");
}
