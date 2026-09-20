"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireProfile } from "@/lib/auth";
import { logActivity } from "@/lib/activities";
import { diffRecords } from "@/lib/diff";
import { parseNumericFormValue, parseStringFormValue } from "@/lib/parse";
import type { DealStage } from "@/lib/types";

const dealStageSchema = z.enum([
  "new",
  "viewing",
  "negotiation",
  "contract",
  "closed_won",
  "closed_lost",
]);

const uuidSchema = z.string().uuid();
const dateOnlySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Некорректная дата")
  .refine((value) => {
    const date = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value);
  }, "Некорректная дата");

const dealSchema = z.object({
  title: z.string().trim().min(2, "Минимум 2 символа").max(180),
  client_id: z.string().uuid().nullable().optional(),
  property_id: z.string().uuid().nullable().optional(),
  stage: dealStageSchema,
  amount: z
    .number()
    .nonnegative("Сумма не может быть отрицательной")
    .nullable()
    .optional(),
  commission: z
    .number()
    .nonnegative("Комиссия не может быть отрицательной")
    .nullable()
    .optional(),
  expected_close_date: dateOnlySchema.nullable().optional(),
  notes: z.string().max(5000).nullable().optional(),
  assigned_to: z.string().uuid().nullable().optional(),
});

export type DealFormState = {
  error?: string;
  success?: boolean;
  fieldErrors?: Record<string, string>;
};

function parseFormData(formData: FormData) {
  const get = (k: string) => formData.get(k);
  const num = (k: string) => parseNumericFormValue(get(k));
  const str = (k: string) => parseStringFormValue(get(k));

  return {
    title: str("title") ?? "",
    client_id: str("client_id"),
    property_id: str("property_id"),
    stage: (get("stage") as string) ?? "new",
    amount: num("amount"),
    commission: num("commission"),
    expected_close_date: str("expected_close_date"),
    notes: str("notes"),
    assigned_to: str("assigned_to"),
  };
}

export async function createDealAction(
  _prev: DealFormState,
  formData: FormData,
): Promise<DealFormState> {
  const parsed = dealSchema.safeParse(parseFormData(formData));
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

  const closed_at =
    parsed.data.stage === "closed_won" || parsed.data.stage === "closed_lost"
      ? new Date().toISOString()
      : null;

  const { data: created, error } = await supabase
    .from("deals")
    .insert({
      ...parsed.data,
      client_id: parsed.data.client_id ?? null,
      property_id: parsed.data.property_id ?? null,
      assigned_to: assignedTo,
      created_by: user.id,
      closed_at,
    })
    .select("id")
    .single();

  if (error || !created) return { error: "Не удалось создать сделку" };

  await logActivity({
    entityType: "deal",
    entityId: created.id,
    type: "created",
    payload: {
      title: parsed.data.title,
      stage: parsed.data.stage,
      amount: parsed.data.amount,
    },
    clientId: parsed.data.client_id ?? null,
    dealId: created.id,
    propertyId: parsed.data.property_id ?? null,
  });

  revalidatePath("/deals");
  revalidatePath("/dashboard");
  redirect(`/deals/${created.id}?created=deal`);
}

export async function updateDealAction(
  id: string,
  _prev: DealFormState,
  formData: FormData,
): Promise<DealFormState> {
  if (!uuidSchema.safeParse(id).success) {
    return { error: "Сделка не найдена" };
  }
  const parsed = dealSchema.safeParse(parseFormData(formData));
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
    .from("deals")
    .select(
      "stage, closed_at, client_id, property_id, title, amount, expected_close_date, assigned_to",
    )
    .eq("id", id)
    .maybeSingle();
  if (existingError || !existing) {
    return { error: "Сделка не найдена или недоступна" };
  }

  let closed_at = existing?.closed_at ?? null;
  if (parsed.data.stage === "closed_won" || parsed.data.stage === "closed_lost") {
    if (!closed_at) closed_at = new Date().toISOString();
  } else {
    closed_at = null;
  }

  const { data: updated, error } = await supabase
    .from("deals")
    .update({
      ...parsed.data,
      client_id: parsed.data.client_id ?? null,
      property_id: parsed.data.property_id ?? null,
      assigned_to:
        profile.role === "admin"
          ? (parsed.data.assigned_to ?? null)
          : existing.assigned_to,
      closed_at,
    })
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error || !updated) {
    return { error: error?.message ?? "Не удалось сохранить сделку" };
  }

  if (existing && existing.stage !== parsed.data.stage) {
    await logActivity({
      entityType: "deal",
      entityId: id,
      type: "stage_changed",
      payload: { from: existing.stage, to: parsed.data.stage },
      clientId: parsed.data.client_id ?? existing.client_id ?? null,
      dealId: id,
      propertyId: parsed.data.property_id ?? existing.property_id ?? null,
    });
  }

  const changes = diffRecords(existing, parsed.data, [
    "title",
    "amount",
    "expected_close_date",
    "assigned_to",
  ]);
  if (Object.keys(changes).length > 0) {
    await logActivity({
      entityType: "deal",
      entityId: id,
      type: "updated",
      payload: { changes },
      clientId: parsed.data.client_id ?? existing?.client_id ?? null,
      dealId: id,
      propertyId: parsed.data.property_id ?? existing?.property_id ?? null,
    });
  }

  revalidatePath("/deals");
  revalidatePath(`/deals/${id}`);
  revalidatePath("/dashboard");
  return { success: true };
}

export async function moveDealStage(id: string, stage: DealStage) {
  if (!uuidSchema.safeParse(id).success) {
    throw new Error("Сделка не найдена");
  }
  if (!dealStageSchema.safeParse(stage).success) {
    throw new Error("Некорректный этап сделки");
  }
  const { supabase } = await requireProfile();

  const { data: existing, error: existingError } = await supabase
    .from("deals")
    .select("stage, closed_at, client_id, property_id")
    .eq("id", id)
    .maybeSingle();
  if (existingError || !existing) {
    throw new Error("Сделка не найдена или недоступна");
  }

  const closed_at =
    stage === "closed_won" || stage === "closed_lost"
      ? (existing.closed_at ?? new Date().toISOString())
      : null;
  const { data: updated, error } = await supabase
    .from("deals")
    .update({ stage, closed_at })
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error || !updated) {
    throw new Error(error?.message ?? "Не удалось изменить этап сделки");
  }

  if (existing && existing.stage !== stage) {
    await logActivity({
      entityType: "deal",
      entityId: id,
      type: "stage_changed",
      payload: { from: existing.stage, to: stage },
      clientId: existing.client_id ?? null,
      dealId: id,
      propertyId: existing.property_id ?? null,
    });
  }

  revalidatePath("/deals");
  revalidatePath("/dashboard");
}

export async function deleteDealAction(id: string) {
  if (!uuidSchema.safeParse(id).success) {
    throw new Error("Сделка не найдена");
  }
  const { supabase } = await requireProfile();
  const { data: existing } = await supabase
    .from("deals")
    .select("title, client_id, property_id")
    .eq("id", id)
    .maybeSingle();
  const { data: deleted, error } = await supabase
    .from("deals")
    .delete()
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error || !deleted) {
    throw new Error(error?.message ?? "Сделка не найдена или недоступна");
  }
  await logActivity({
    entityType: "deal",
    entityId: id,
    type: "deleted",
    payload: existing ? { title: existing.title } : {},
    clientId: existing?.client_id ?? null,
    propertyId: existing?.property_id ?? null,
  });
  revalidatePath("/deals");
  revalidatePath("/dashboard");
  redirect("/deals");
}
