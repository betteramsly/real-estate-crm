"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const propertySchema = z.object({
  title: z.string().min(2, "Минимум 2 символа"),
  property_type: z.enum(["apartment", "house", "commercial", "land"]),
  listing_type: z.enum(["sale", "rent"]),
  status: z.enum(["active", "reserved", "sold", "archived"]),
  price: z.number().min(0, "Цена не может быть отрицательной"),
  area: z.number().nullable().optional(),
  rooms: z.number().int().nullable().optional(),
  address: z.string().nullable().optional(),
  city: z.string().nullable().optional(),
  district: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  cover_url: z.string().nullable().optional(),
  assigned_to: z.string().uuid().nullable().optional(),
});

export type PropertyFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

function parseFormData(formData: FormData) {
  const get = (k: string) => formData.get(k);
  const num = (k: string) => {
    const v = get(k);
    if (v === null || v === undefined || v === "") return null;
    const n = Number(v);
    return Number.isNaN(n) ? null : n;
  };
  const str = (k: string) => {
    const v = get(k);
    return typeof v === "string" && v.length > 0 ? v : null;
  };

  return {
    title: (get("title") as string) ?? "",
    property_type: (get("property_type") as string) ?? "apartment",
    listing_type: (get("listing_type") as string) ?? "sale",
    status: (get("status") as string) ?? "active",
    price: num("price") ?? 0,
    area: num("area"),
    rooms: num("rooms"),
    address: str("address"),
    city: str("city"),
    district: str("district"),
    description: str("description"),
    cover_url: str("cover_url"),
    assigned_to: str("assigned_to"),
  };
}

export async function createPropertyAction(
  _prev: PropertyFormState,
  formData: FormData,
): Promise<PropertyFormState> {
  const parsed = propertySchema.safeParse(parseFormData(formData));
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
    .from("properties")
    .insert({
      ...parsed.data,
      assigned_to: parsed.data.assigned_to ?? user.id,
      created_by: user.id,
    })
    .select("id")
    .single();

  if (error) return { error: error.message };

  revalidatePath("/properties");
  redirect(`/properties/${created.id}`);
}

export async function updatePropertyAction(
  id: string,
  _prev: PropertyFormState,
  formData: FormData,
): Promise<PropertyFormState> {
  const parsed = propertySchema.safeParse(parseFormData(formData));
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
    .from("properties")
    .update(parsed.data)
    .eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/properties");
  revalidatePath(`/properties/${id}`);
  return {};
}

export async function deletePropertyAction(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from("properties").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/properties");
  redirect("/properties");
}
