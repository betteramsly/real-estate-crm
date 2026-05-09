"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/actions/activities";
import { diffRecords } from "@/lib/diff";
import { parseNumericFormValue, parseStringFormValue } from "@/lib/parse";
import type { DealStage } from "@/lib/types";

const dealSchema = z.object({
  title: z.string().min(2, "Минимум 2 символа"),
  client_id: z.string().uuid().nullable().optional(),
  property_id: z.string().uuid().nullable().optional(),
  stage: z.enum([
    "new",
    "viewing",
    "negotiation",
    "contract",
    "closed_won",
    "closed_lost",
  ]),
  amount: z.number().nullable().optional(),
  commission: z.number().nullable().optional(),
  expected_close_date: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
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
    title: (get("title") as string) ?? "",
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

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Не авторизован" };

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
      assigned_to: parsed.data.assigned_to ?? user.id,
      created_by: user.id,
      closed_at,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

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
  const parsed = dealSchema.safeParse(parseFormData(formData));
  if (!parsed.success) {
    return {
      error: "Проверьте поля формы",
      fieldErrors: Object.fromEntries(
        parsed.error.errors.map((e) => [e.path.join("."), e.message]),
      ),
    };
  }

  const supabase = createClient();

  const { data: existing } = await supabase
    .from("deals")
    .select(
      "stage, closed_at, client_id, property_id, title, amount, expected_close_date, assigned_to",
    )
    .eq("id", id)
    .single();

  let closed_at = existing?.closed_at ?? null;
  if (parsed.data.stage === "closed_won" || parsed.data.stage === "closed_lost") {
    if (!closed_at) closed_at = new Date().toISOString();
  } else {
    closed_at = null;
  }

  const { error } = await supabase
    .from("deals")
    .update({
      ...parsed.data,
      client_id: parsed.data.client_id ?? null,
      property_id: parsed.data.property_id ?? null,
      closed_at,
    })
    .eq("id", id);

  if (error) return { error: error.message };

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
  const supabase = createClient();

  const { data: existing } = await supabase
    .from("deals")
    .select("stage, client_id, property_id")
    .eq("id", id)
    .single();

  const closed_at =
    stage === "closed_won" || stage === "closed_lost"
      ? new Date().toISOString()
      : null;
  const { error } = await supabase
    .from("deals")
    .update({ stage, closed_at })
    .eq("id", id);
  if (error) throw new Error(error.message);

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
  const supabase = createClient();
  const { error } = await supabase.from("deals").delete().eq("id", id);
  if (error) throw new Error(error.message);
  await logActivity({
    entityType: "deal",
    entityId: id,
    type: "deleted",
  });
  revalidatePath("/deals");
  revalidatePath("/dashboard");
  redirect("/deals");
}
