"use server";

import { createClient } from "@/lib/supabase/server";
import type {
  ActivityEntityType,
  ActivityType,
  ActivityWithActor,
} from "@/lib/types";

interface LogActivityInput {
  entityType: ActivityEntityType;
  entityId: string;
  type: ActivityType;
  payload?: Record<string, unknown>;
  clientId?: string | null;
  dealId?: string | null;
  propertyId?: string | null;
}

/**
 * Журналирует событие в таблицу activities.
 * Не бросает исключений: если запись провалилась — основное действие
 * (создание клиента/сделки и т.д.) всё равно завершится успешно.
 */
export async function logActivity(input: LogActivityInput): Promise<void> {
  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from("activities").insert({
      entity_type: input.entityType,
      entity_id: input.entityId,
      type: input.type,
      payload: input.payload ?? {},
      client_id: input.clientId ?? null,
      deal_id: input.dealId ?? null,
      property_id: input.propertyId ?? null,
      actor_id: user.id,
    });
  } catch (e) {
    if (process.env.NODE_ENV !== "production") {
      console.error("logActivity failed:", e);
    }
  }
}

/**
 * Возвращает таймлайн событий по сущности.
 * Используется на карточках клиента и сделки.
 */
export async function getActivities(params: {
  clientId?: string;
  dealId?: string;
  propertyId?: string;
  limit?: number;
}): Promise<ActivityWithActor[]> {
  const supabase = createClient();

  let query = supabase
    .from("activities")
    .select(
      "id, entity_type, entity_id, type, payload, client_id, deal_id, property_id, actor_id, created_at, actor:profiles!activities_actor_id_fkey(id, full_name, avatar_url)",
    )
    .order("created_at", { ascending: false })
    .limit(params.limit ?? 50);

  if (params.clientId) query = query.eq("client_id", params.clientId);
  if (params.dealId) query = query.eq("deal_id", params.dealId);
  if (params.propertyId) query = query.eq("property_id", params.propertyId);

  const { data, error } = await query;
  if (error || !data) return [];
  return data as unknown as ActivityWithActor[];
}
