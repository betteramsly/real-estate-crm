"use server";

import { randomBytes } from "crypto";
import { cookies } from "next/headers";
import { requireProfile } from "@/lib/auth";
import {
  SHARE_MAX_ACTIVE,
  SHARE_TOKEN_BYTES,
  SHARE_VISITOR_COOKIE,
  emptyShareStats,
  isShareEventType,
  isShareId,
  isShareToken,
  isShareTtlDays,
  isShareVisitorKey,
  parseOpenCatalogShare,
  sanitizeSharePropertyIds,
  summarizeShareEvents,
  type CatalogShareEventRow,
  type CatalogShareWithStats,
  type OpenCatalogShareResult,
} from "@/lib/catalog-share";
import { createClient } from "@/lib/supabase/server";
import type { CatalogShare } from "@/lib/types";

export type CatalogShareActionResult =
  | { ok: true; share: CatalogShare }
  | { ok: false; error: string };

export async function createCatalogShareAction(input: {
  propertyIds: string[];
  days: number;
  title?: string;
}): Promise<CatalogShareActionResult> {
  const { supabase, profile } = await requireProfile();
  const propertyIds = sanitizeSharePropertyIds(input.propertyIds);
  if (!propertyIds.length) {
    return { ok: false, error: "Отметьте хотя бы один комплекс." };
  }
  if (!isShareTtlDays(input.days)) {
    return { ok: false, error: "Выберите срок: 1, 3 или 7 дней." };
  }

  const { data: existing, error: existingError } = await supabase
    .from("properties")
    .select("id")
    .in("id", propertyIds)
    .neq("status", "archived");

  if (existingError) {
    return { ok: false, error: "Не удалось проверить комплексы." };
  }

  const allowed = new Set((existing ?? []).map((row) => row.id));
  const kept = propertyIds.filter((id) => allowed.has(id));
  if (!kept.length) {
    return { ok: false, error: "Эти комплексы больше недоступны." };
  }

  const { count, error: countError } = await supabase
    .from("catalog_shares")
    .select("id", { count: "exact", head: true })
    .eq("created_by", profile.id)
    .is("revoked_at", null)
    .gt("expires_at", new Date().toISOString());

  if (countError) {
    return { ok: false, error: "Не удалось проверить активные ссылки." };
  }
  if ((count ?? 0) >= SHARE_MAX_ACTIVE) {
    return {
      ok: false,
      error: "Слишком много активных ссылок. Сначала отзовите старые.",
    };
  }

  const title = (input.title ?? "").trim().slice(0, 80) || `Подборка · ${kept.length} ЖК`;
  const token = randomBytes(SHARE_TOKEN_BYTES).toString("base64url");
  const expiresAt = new Date(Date.now() + input.days * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from("catalog_shares")
    .insert({
      token,
      created_by: profile.id,
      title,
      property_ids: kept,
      expires_at: expiresAt,
    })
    .select(
      "id, token, created_by, title, property_ids, expires_at, revoked_at, created_at",
    )
    .single<CatalogShare>();

  if (error || !data) {
    return { ok: false, error: "Не удалось создать ссылку." };
  }

  return { ok: true, share: data };
}

export async function revokeCatalogShareAction(
  id: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const { supabase, profile } = await requireProfile();
  if (!isShareId(id)) return { ok: false, error: "Ссылка не найдена." };

  const { data, error } = await supabase
    .from("catalog_shares")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", id)
    .eq("created_by", profile.id)
    .is("revoked_at", null)
    .select("id")
    .maybeSingle();

  if (error) {
    return { ok: false, error: "Не удалось отозвать ссылку." };
  }
  if (!data) {
    return { ok: false, error: "Ссылка уже недействительна." };
  }
  return { ok: true };
}

export async function listCatalogSharesAction(): Promise<CatalogShareWithStats[]> {
  const { supabase, profile } = await requireProfile();
  const { data } = await supabase
    .from("catalog_shares")
    .select(
      "id, token, created_by, title, property_ids, expires_at, revoked_at, created_at",
    )
    .eq("created_by", profile.id)
    .is("revoked_at", null)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(SHARE_MAX_ACTIVE)
    .returns<CatalogShare[]>();

  const shares = data ?? [];
  if (!shares.length) return [];

  const { data: events } = await supabase
    .from("catalog_share_events")
    .select("share_id, event_type, property_id, visitor_key, created_at")
    .in(
      "share_id",
      shares.map((share) => share.id),
    )
    .returns<CatalogShareEventRow[]>();

  const viewedIds = [
    ...new Set(
      (events ?? [])
        .map((event) => event.property_id)
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  const titles: Record<string, string> = {};
  if (viewedIds.length) {
    const { data: properties } = await supabase
      .from("properties")
      .select("id, title")
      .in("id", viewedIds);
    for (const property of properties ?? []) {
      titles[property.id] = property.title;
    }
  }

  const stats = summarizeShareEvents(events ?? [], titles);
  return shares.map((share) => ({
    ...share,
    stats: stats[share.id] ?? emptyShareStats(),
  }));
}

export async function recordShareEventAction(input: {
  token: string;
  event: string;
  propertyId?: string | null;
}): Promise<void> {
  if (!isShareToken(input.token) || !isShareEventType(input.event)) return;
  if (input.propertyId && !isShareId(input.propertyId)) return;

  const cookieStore = await cookies();
  let visitor = cookieStore.get(SHARE_VISITOR_COOKIE)?.value ?? "";
  if (!isShareVisitorKey(visitor)) {
    visitor = randomBytes(SHARE_TOKEN_BYTES).toString("base64url");
    try {
      cookieStore.set(SHARE_VISITOR_COOKIE, visitor, {
        httpOnly: true,
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 180,
        secure: process.env.NODE_ENV === "production",
      });
    } catch {
      // Server component / prefetch cannot write cookies.
    }
  }

  const supabase = await createClient();
  await supabase.rpc("record_catalog_share_event", {
    share_token: input.token,
    event_type: input.event,
    property_id: input.event === "open" ? null : (input.propertyId ?? null),
    visitor_key: visitor,
  });
}

export async function loadCatalogShare(
  token: string,
): Promise<OpenCatalogShareResult> {
  if (!isShareToken(token)) {
    return { ok: false, reason: "invalid" };
  }
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("open_catalog_share", {
    share_token: token,
  });
  if (error) {
    return { ok: false, reason: "invalid" };
  }
  return parseOpenCatalogShare(data);
}
