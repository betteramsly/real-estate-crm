"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/actions/activities";
import { parseNumericFormValue, parseStringFormValue } from "@/lib/parse";
import { diffRecords } from "@/lib/diff";

const clientSchema = z.object({
  full_name: z.string().min(2, "Минимум 2 символа"),
  phone: z.string().nullable().optional(),
  email: z
    .string()
    .email("Некорректный email")
    .nullable()
    .or(z.literal(""))
    .optional(),
  source: z.enum(["referral", "cian", "avito", "instagram", "other"]),
  status: z.enum(["new", "in_progress", "won", "lost"]),
  deal_type: z.enum(["buy", "sell", "rent_in", "rent_out"]),
  budget_min: z.number().nullable().optional(),
  budget_max: z.number().nullable().optional(),
  notes: z.string().nullable().optional(),
  assigned_to: z.string().uuid().nullable().optional(),
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
    full_name: (get("full_name") as string) ?? "",
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

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Не авторизован" };

  const { data: created, error } = await supabase
    .from("clients")
    .insert({
      ...parsed.data,
      email: parsed.data.email || null,
      assigned_to: parsed.data.assigned_to ?? user.id,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

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

  const supabase = createClient();

  const { data: existing } = await supabase
    .from("clients")
    .select("status, full_name, deal_type, assigned_to, budget_min, budget_max")
    .eq("id", id)
    .single();

  const { error } = await supabase
    .from("clients")
    .update({
      ...parsed.data,
      email: parsed.data.email || null,
    })
    .eq("id", id);

  if (error) return { error: error.message };

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
  const supabase = createClient();
  const { error } = await supabase.from("clients").delete().eq("id", id);
  if (error) throw new Error(error.message);
  await logActivity({
    entityType: "client",
    entityId: id,
    type: "deleted",
    clientId: null,
  });
  revalidatePath("/clients");
  redirect("/clients");
}
