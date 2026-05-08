"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
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

  const { error } = await supabase.from("tasks").insert({
    ...parsed.data,
    client_id: parsed.data.client_id ?? null,
    deal_id: parsed.data.deal_id ?? null,
    property_id: parsed.data.property_id ?? null,
    assigned_to: parsed.data.assigned_to ?? user.id,
    created_by: user.id,
  });

  if (error) return { error: error.message };

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
  const { error } = await supabase
    .from("tasks")
    .update({ status })
    .eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/tasks");
  revalidatePath("/dashboard");
}

export async function deleteTaskAction(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from("tasks").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/tasks");
  revalidatePath("/dashboard");
}
