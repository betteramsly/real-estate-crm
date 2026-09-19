"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/actions/activities";
import type { TaskStatus } from "@/lib/types";

const taskStatusSchema = z.enum(["todo", "in_progress", "done", "cancelled"]);

const taskSchema = z.object({
  title: z.string().min(2, "Минимум 2 символа"),
  description: z.string().nullable().optional(),
  status: taskStatusSchema,
  priority: z.enum(["low", "medium", "high"]),
  due_at: z.string().nullable().optional(),
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
  const str = (k: string) => {
    const v = get(k);
    return typeof v === "string" && v.length > 0 ? v : null;
  };

  const due = str("due_at");

  return {
    title: (get("title") as string) ?? "",
    description: str("description"),
    status: (get("status") as string) ?? "todo",
    priority: (get("priority") as string) ?? "medium",
    due_at: due ? new Date(due).toISOString() : null,
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

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Не авторизован" };

  const { data: created, error } = await supabase
    .from("tasks")
    .insert({
      ...parsed.data,
      client_id: parsed.data.client_id ?? null,
      deal_id: parsed.data.deal_id ?? null,
      property_id: parsed.data.property_id ?? null,
      assigned_to: parsed.data.assigned_to ?? user.id,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  if (created) {
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
  }

  revalidatePath("/tasks");
  revalidatePath("/dashboard");
  redirect("/tasks");
}

export async function updateTaskAction(
  id: string,
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

  const { supabase } = await requireUser();
  const { data: updated, error } = await supabase
    .from("tasks")
    .update({
      ...parsed.data,
      client_id: parsed.data.client_id ?? null,
      deal_id: parsed.data.deal_id ?? null,
      property_id: parsed.data.property_id ?? null,
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
  if (!taskStatusSchema.safeParse(status).success) {
    throw new Error("Некорректный статус задачи");
  }
  const { supabase } = await requireUser();

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
  const { supabase } = await requireUser();

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
