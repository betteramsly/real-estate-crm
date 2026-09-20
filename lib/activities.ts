import "server-only";

import { createClient } from "@/lib/supabase/server";
import type {
  ActivityEntityType,
  ActivityType,
  ActivityWithActor,
} from "@/lib/types";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

interface LogActivityInput {
  entityType: ActivityEntityType;
  entityId: string;
  type: ActivityType;
  payload?: Record<string, unknown>;
  clientId?: string | null;
  dealId?: string | null;
  propertyId?: string | null;
}

/** Internal audit helper. It is deliberately not a public Server Action. */
export async function logActivity(input: LogActivityInput): Promise<void> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user || !UUID_RE.test(input.entityId)) return;

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
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("logActivity failed:", error);
    }
  }
}

export async function getActivities(params: {
  clientId?: string;
  dealId?: string;
  propertyId?: string;
  limit?: number;
}): Promise<ActivityWithActor[]> {
  const ids = [params.clientId, params.dealId, params.propertyId].filter(
    (value): value is string => Boolean(value),
  );
  if (!ids.length || ids.some((id) => !UUID_RE.test(id))) return [];

  const supabase = await createClient();
  const limit = Math.min(100, Math.max(1, Math.trunc(params.limit ?? 50)));
  let query = supabase
    .from("activities")
    .select(
      "id, entity_type, entity_id, type, payload, client_id, deal_id, property_id, actor_id, created_at, actor:profiles!activities_actor_id_fkey(id, full_name, avatar_url)",
    )
    .order("created_at", { ascending: false })
    .limit(limit);

  if (params.clientId) query = query.eq("client_id", params.clientId);
  if (params.dealId) query = query.eq("deal_id", params.dealId);
  if (params.propertyId) query = query.eq("property_id", params.propertyId);

  const { data, error } = await query;
  if (error || !data) return [];
  return data as unknown as ActivityWithActor[];
}
