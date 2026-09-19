"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireProfile } from "@/lib/auth";
import {
  canReopenPropertyFeedback,
  canResolvePropertyFeedback,
  isPropertyFeedbackId,
  TEAM_FEEDBACK_UNDONE_STATUSES,
  validatePropertyFeedbackBody,
} from "@/lib/property-feedback";
import type { PropertyFeedback } from "@/lib/types";

const uuidSchema = z.string().uuid();

export type PropertyFeedbackActionResult =
  | { ok: true }
  | { ok: false; error: string };

function revalidateFeedback(input: {
  propertyId?: string | null;
  authorId?: string | null;
}) {
  revalidatePath("/", "layout");
  revalidatePath("/team");
  revalidatePath("/dashboard");
  if (input.authorId) revalidatePath(`/team/${input.authorId}`);
  if (input.propertyId) revalidatePath(`/properties/${input.propertyId}`);
}

export async function createPropertyFeedbackAction(
  propertyId: string,
  body: string,
): Promise<PropertyFeedbackActionResult> {
  if (!isPropertyFeedbackId(propertyId) || !uuidSchema.safeParse(propertyId).success) {
    return { ok: false, error: "Комплекс не найден" };
  }
  const parsed = validatePropertyFeedbackBody(body);
  if (!parsed.ok) return parsed;

  const { supabase, profile } = await requireProfile();

  const { data: property, error: propertyError } = await supabase
    .from("properties")
    .select("id")
    .eq("id", propertyId)
    .maybeSingle();
  if (propertyError || !property) {
    return { ok: false, error: "Комплекс не найден" };
  }

  const { error } = await supabase.from("property_feedback").insert({
    property_id: propertyId,
    author_id: profile.id,
    body: parsed.body,
    status: "open",
    task_id: null,
    resolved_at: null,
    resolved_by: null,
  });

  if (error) return { ok: false, error: error.message };

  revalidateFeedback({ propertyId, authorId: profile.id });
  return { ok: true };
}

async function loadFeedbackForAdmin(id: string) {
  const { supabase, profile } = await requireProfile();
  if (profile.role !== "admin") {
    return { ok: false as const, error: "Недостаточно прав" };
  }
  if (!isPropertyFeedbackId(id)) {
    return { ok: false as const, error: "Заметка не найдена" };
  }

  const { data, error } = await supabase
    .from("property_feedback")
    .select(
      "id, property_id, author_id, body, status, task_id, resolved_at, resolved_by, created_at, updated_at",
    )
    .eq("id", id)
    .maybeSingle<PropertyFeedback>();

  if (error || !data) {
    return { ok: false as const, error: "Заметка не найдена" };
  }

  return { ok: true as const, supabase, profile, feedback: data };
}

export async function resolvePropertyFeedbackAction(
  id: string,
): Promise<PropertyFeedbackActionResult> {
  const loaded = await loadFeedbackForAdmin(id);
  if (!loaded.ok) return loaded;

  const { supabase, profile, feedback } = loaded;
  if (!canResolvePropertyFeedback(feedback.status)) {
    return { ok: false, error: "Закрыть можно только несделанную заметку" };
  }

  const { data: updated, error } = await supabase
    .from("property_feedback")
    .update({
      status: "done",
      resolved_at: new Date().toISOString(),
      resolved_by: profile.id,
    })
    .eq("id", id)
    .in("status", [...TEAM_FEEDBACK_UNDONE_STATUSES])
    .select("id")
    .maybeSingle();

  if (error || !updated) {
    return { ok: false, error: error?.message ?? "Не удалось отметить сделанным" };
  }

  revalidateFeedback({
    propertyId: feedback.property_id,
    authorId: feedback.author_id,
  });
  return { ok: true };
}

export async function reopenPropertyFeedbackAction(
  id: string,
): Promise<PropertyFeedbackActionResult> {
  const loaded = await loadFeedbackForAdmin(id);
  if (!loaded.ok) return loaded;

  const { supabase, feedback } = loaded;
  if (!canReopenPropertyFeedback(feedback.status)) {
    return { ok: false, error: "Вернуть можно только сделанную заметку" };
  }

  const { data: updated, error } = await supabase
    .from("property_feedback")
    .update({
      status: "open",
      task_id: null,
      resolved_at: null,
      resolved_by: null,
    })
    .eq("id", id)
    .eq("status", "done")
    .select("id")
    .maybeSingle();

  if (error || !updated) {
    return { ok: false, error: error?.message ?? "Не удалось вернуть заметку" };
  }

  revalidateFeedback({
    propertyId: feedback.property_id,
    authorId: feedback.author_id,
  });
  return { ok: true };
}
