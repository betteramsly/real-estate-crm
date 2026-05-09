"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/actions/activities";
import type { TaskStatus } from "@/lib/types";

const taskSchema = z.object({
  title: z.string().min(2, "Минимум 2 символа"),
  description: z.string().nullable().optional(),
  status: z.enum(["todo", "in_progress", "done", "cancelled"]),
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

  const supabase = createClient();
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

  const supabase = createClient();
  const { error } = await supabase
    .from("tasks")
    .update({
      ...parsed.data,
      client_id: parsed.data.client_id ?? null,
      deal_id: parsed.data.deal_id ?? null,
      property_id: parsed.data.property_id ?? null,
    })
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/tasks");
  revalidatePath("/dashboard");
  return {};
}

export async function setTaskStatus(id: string, status: TaskStatus) {
  const supabase = createClient();

  const { data: existing } = await supabase
    .from("tasks")
    .select("status, title, client_id, deal_id, property_id")
    .eq("id", id)
    .single();

  const { error } = await supabase
    .from("tasks")
    .update({ status })
    .eq("id", id);
  if (error) throw new Error(error.message);

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
  const supabase = createClient();

  const { data: existing } = await supabase
    .from("tasks")
    .select("client_id, deal_id, property_id, title")
    .eq("id", id)
    .single();

  const { error } = await supabase.from("tasks").delete().eq("id", id);
  if (error) throw new Error(error.message);

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
