"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/actions/activities";
import { parseNumericFormValue, parseStringFormValue } from "@/lib/parse";

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
  success?: boolean;
  fieldErrors?: Record<string, string>;
};

function parseFormData(formData: FormData) {
  const get = (k: string) => formData.get(k);
  const num = (k: string) => parseNumericFormValue(get(k));
  const str = (k: string) => parseStringFormValue(get(k));

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

  await logActivity({
    entityType: "property",
    entityId: created.id,
    type: "created",
    payload: { title: parsed.data.title, price: parsed.data.price },
    propertyId: created.id,
  });

  revalidatePath("/properties");
  redirect(`/properties/${created.id}?created=property`);
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

  const { data: existing } = await supabase
    .from("properties")
    .select("status, price, title")
    .eq("id", id)
    .single();

  const { error } = await supabase
    .from("properties")
    .update(parsed.data)
    .eq("id", id);

  if (error) return { error: error.message };

  if (existing) {
    if (existing.status !== parsed.data.status) {
      await logActivity({
        entityType: "property",
        entityId: id,
        type: "status_changed",
        payload: { from: existing.status, to: parsed.data.status },
        propertyId: id,
      });
    } else if (
      existing.price !== parsed.data.price ||
      existing.title !== parsed.data.title
    ) {
      await logActivity({
        entityType: "property",
        entityId: id,
        type: "updated",
        payload: {
          changes: {
            ...(existing.price !== parsed.data.price
              ? { price: { from: existing.price, to: parsed.data.price } }
              : {}),
            ...(existing.title !== parsed.data.title
              ? { title: { from: existing.title, to: parsed.data.title } }
              : {}),
          },
        },
        propertyId: id,
      });
    }
  }

  revalidatePath("/properties");
  revalidatePath(`/properties/${id}`);
  return { success: true };
}

export async function deletePropertyAction(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from("properties").delete().eq("id", id);
  if (error) throw new Error(error.message);
  await logActivity({
    entityType: "property",
    entityId: id,
    type: "deleted",
  });
  revalidatePath("/properties");
  redirect("/properties");
}
