"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireProfile } from "@/lib/auth";
import { logActivity } from "@/lib/activities";
import { parseDateTimeFormValue, parseStringFormValue } from "@/lib/parse";
import type { TaskStatus } from "@/lib/types";

const taskStatusSchema = z.enum(["todo", "in_progress", "done", "cancelled"]);
const uuidSchema = z.string().uuid();

const taskSchema = z.object({
  title: z.string().trim().min(2, "Минимум 2 символа").max(180),
  description: z.string().max(5000).nullable().optional(),
  status: taskStatusSchema,
  priority: z.enum(["low", "medium", "high"]),
  due_at: z.string().datetime({ offset: true }).nullable().optional(),
  client_id: z.string().uuid().nullable().optional(),
  deal_id: z.string().uuid().nullable().optional(),
  property_id: z.string().uuid().nullable().optional(),
  assigned_to: z.string().uuid().nullable().optional(),
});

export type TaskFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

function parseFormData(formData: FormData) {
  const get = (k: string) => formData.get(k);
  const str = (k: string) => parseStringFormValue(get(k));
  const rawOffset = Number(str("timezone_offset") ?? 0);
  const timezoneOffset =
    Number.isInteger(rawOffset) && rawOffset >= -840 && rawOffset <= 840
      ? rawOffset
      : 0;

  return {
    title: str("title") ?? "",
    description: str("description"),
    status: (get("status") as string) ?? "todo",
    priority: (get("priority") as string) ?? "medium",
    due_at: parseDateTimeFormValue(get("due_at"), timezoneOffset),
    client_id: str("client_id"),
    deal_id: str("deal_id"),
    property_id: str("property_id"),
    assigned_to: str("assigned_to"),
  };
}

export async function createTaskAction(
  _prev: TaskFormState,
  formData: FormData,
): Promise<TaskFormState> {
  const parsed = taskSchema.safeParse(parseFormData(formData));
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
    .from("tasks")
    .insert({
      ...parsed.data,
      client_id: parsed.data.client_id ?? null,
      deal_id: parsed.data.deal_id ?? null,
      property_id: parsed.data.property_id ?? null,
      assigned_to: assignedTo,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error || !created) return { error: "Не удалось создать задачу" };

  await logActivity({
    entityType: "task",
    entityId: created.id,
    type: "created",
    payload: {
      title: parsed.data.title,
      priority: parsed.data.priority,
      due_at: parsed.data.due_at,
    },
    clientId: parsed.data.client_id ?? null,
    dealId: parsed.data.deal_id ?? null,
    propertyId: parsed.data.property_id ?? null,
  });

  revalidatePath("/tasks");
  revalidatePath("/dashboard");
  redirect("/tasks");
}

export async function updateTaskAction(
  id: string,
  _prev: TaskFormState,
  formData: FormData,
): Promise<TaskFormState> {
  if (!uuidSchema.safeParse(id).success) {
    return { error: "Задача не найдена" };
  }
  const parsed = taskSchema.safeParse(parseFormData(formData));
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
    .from("tasks")
    .select("assigned_to")
    .eq("id", id)
    .maybeSingle();
  if (existingError || !existing) {
    return { error: "Задача не найдена или недоступна" };
  }
  const { data: updated, error } = await supabase
    .from("tasks")
    .update({
      ...parsed.data,
      client_id: parsed.data.client_id ?? null,
      deal_id: parsed.data.deal_id ?? null,
      property_id: parsed.data.property_id ?? null,
      assigned_to:
        profile.role === "admin"
          ? (parsed.data.assigned_to ?? null)
          : existing.assigned_to,
    })
    .eq("id", id)
    .select("id")
    .maybeSingle();

  if (error || !updated) {
    return { error: error?.message ?? "Задача не найдена или недоступна" };
  }

  revalidatePath("/tasks");
  revalidatePath("/dashboard");
  return {};
}

export async function setTaskStatus(id: string, status: TaskStatus) {
  if (!uuidSchema.safeParse(id).success) {
    throw new Error("Задача не найдена");
  }
  if (!taskStatusSchema.safeParse(status).success) {
    throw new Error("Некорректный статус задачи");
  }
  const { supabase } = await requireProfile();

  const { data: existing, error: existingError } = await supabase
    .from("tasks")
    .select("status, title, client_id, deal_id, property_id")
    .eq("id", id)
    .maybeSingle();
  if (existingError || !existing) {
    throw new Error("Задача не найдена или недоступна");
  }

  const { data: updated, error } = await supabase
    .from("tasks")
    .update({ status })
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error || !updated) {
    throw new Error(error?.message ?? "Не удалось изменить статус задачи");
  }

  if (existing && existing.status !== status) {
    await logActivity({
      entityType: "task",
      entityId: id,
      type: status === "done" ? "task_completed" : "status_changed",
      payload: { from: existing.status, to: status, title: existing.title },
      clientId: existing.client_id ?? null,
      dealId: existing.deal_id ?? null,
      propertyId: existing.property_id ?? null,
    });
  }

  revalidatePath("/tasks");
  revalidatePath("/dashboard");
}

export async function deleteTaskAction(id: string) {
  if (!uuidSchema.safeParse(id).success) {
    throw new Error("Задача не найдена");
  }
  const { supabase } = await requireProfile();

  const { data: existing, error: existingError } = await supabase
    .from("tasks")
    .select("client_id, deal_id, property_id, title")
    .eq("id", id)
    .maybeSingle();
  if (existingError || !existing) {
    throw new Error("Задача не найдена или недоступна");
  }

  const { data: deleted, error } = await supabase
    .from("tasks")
    .delete()
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error || !deleted) {
    throw new Error(error?.message ?? "Не удалось удалить задачу");
  }

  await logActivity({
    entityType: "task",
    entityId: id,
    type: "deleted",
    payload: existing ? { title: existing.title } : {},
    clientId: existing?.client_id ?? null,
    dealId: existing?.deal_id ?? null,
    propertyId: existing?.property_id ?? null,
  });

  revalidatePath("/tasks");
  revalidatePath("/dashboard");
}
