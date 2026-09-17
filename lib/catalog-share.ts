import type { CatalogShare, Property } from "@/lib/types";

export const SHARE_TTL_DAYS = [1, 3, 7] as const;
export type ShareTtlDays = (typeof SHARE_TTL_DAYS)[number];

export const SHARE_MAX_PROPERTIES = 12;
export const SHARE_MAX_ACTIVE = 20;
export const SHARE_TOKEN_BYTES = 18;
export const SHARE_VISITOR_COOKIE = "share_vid";
export const SHARE_EVENT_TYPES = ["open", "view", "contact"] as const;
export type ShareEventType = (typeof SHARE_EVENT_TYPES)[number];

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const SHARE_TOKEN_RE = /^[A-Za-z0-9_-]{20,64}$/;

export function isShareId(value: string) {
  return UUID_RE.test(value);
}

export function isShareToken(value: string) {
  return SHARE_TOKEN_RE.test(value);
}

export function isShareTtlDays(value: number): value is ShareTtlDays {
  return (SHARE_TTL_DAYS as readonly number[]).includes(value);
}

export function isShareEventType(value: string): value is ShareEventType {
  return (SHARE_EVENT_TYPES as readonly string[]).includes(value);
}

export function isShareVisitorKey(value: string) {
  return /^[A-Za-z0-9_-]{20,64}$/.test(value);
}

export function sanitizeSharePropertyIds(ids: unknown): string[] {
  if (!Array.isArray(ids)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const id of ids) {
    if (typeof id !== "string" || !UUID_RE.test(id) || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
    if (out.length >= SHARE_MAX_PROPERTIES) break;
  }
  return out;
}

export function sharePath(token: string) {
  return `/s/${encodeURIComponent(token)}`;
}

export function whatsappShareUrl(pageUrl: string) {
  const text = `Посмотрели эти жилые комплексы. Ссылка временная — откройте, чтобы сравнить:\n${pageUrl}`;
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}

export function phoneToWhatsapp(phone: string | null | undefined): string | null {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("8")) return `7${digits.slice(1)}`;
  if (digits.length === 11 && digits.startsWith("7")) return digits;
  if (digits.length === 10) return `7${digits}`;
  return null;
}

export type ShareAgent = {
  name: string;
  whatsapp: string | null;
};

export function parseShareAgent(value: unknown): ShareAgent | null {
  if (!value || typeof value !== "object") return null;
  const row = value as Record<string, unknown>;
  const rawName = typeof row.name === "string" ? row.name.trim() : "";
  const whatsapp =
    typeof row.phone === "string" ? phoneToWhatsapp(row.phone) : null;
  if (!rawName && !whatsapp) return null;
  return { name: rawName || "Агент", whatsapp };
}

export function agentWhatsappUrl({
  whatsapp,
  shareTitle,
  propertyTitle,
}: {
  whatsapp: string;
  shareTitle?: string | null;
  propertyTitle?: string | null;
}) {
  const parts = ["Здравствуйте."];
  if (propertyTitle) {
    parts.push(`Смотрю «${propertyTitle}» в вашей подборке.`);
  } else if (shareTitle) {
    parts.push(`Смотрю подборку «${shareTitle}».`);
  } else {
    parts.push("Смотрю вашу подборку жилых комплексов.");
  }
  parts.push("Хочу уточнить детали.");
  return `https://wa.me/${whatsapp}?text=${encodeURIComponent(parts.join(" "))}`;
}

export type CatalogShareStats = {
  opens: number;
  views: number;
  contacts: number;
  lastOpenAt: string | null;
  viewed: { id: string; title: string }[];
};

export type CatalogShareWithStats = CatalogShare & {
  stats: CatalogShareStats;
};

export function emptyShareStats(): CatalogShareStats {
  return { opens: 0, views: 0, contacts: 0, lastOpenAt: null, viewed: [] };
}

export type CatalogShareEventRow = {
  share_id: string;
  event_type: string;
  property_id: string | null;
  visitor_key: string | null;
  created_at: string;
};

export function summarizeShareEvents(
  events: CatalogShareEventRow[],
  titles: Record<string, string>,
): Record<string, CatalogShareStats> {
  const byShare = new Map<string, CatalogShareEventRow[]>();
  for (const event of events) {
    const list = byShare.get(event.share_id) ?? [];
    list.push(event);
    byShare.set(event.share_id, list);
  }

  const out: Record<string, CatalogShareStats> = {};
  for (const [shareId, rows] of byShare) {
    const openVisitors = new Set<string>();
    const contactVisitors = new Set<string>();
    const viewedIds: string[] = [];
    const viewedSet = new Set<string>();
    let lastOpenAt: string | null = null;
    let openAnon = 0;
    let contactAnon = 0;

    for (const row of rows) {
      if (row.event_type === "open") {
        if (row.visitor_key) openVisitors.add(row.visitor_key);
        else openAnon += 1;
        if (!lastOpenAt || row.created_at > lastOpenAt) lastOpenAt = row.created_at;
      }
      if (row.event_type === "contact") {
        if (row.visitor_key) contactVisitors.add(row.visitor_key);
        else contactAnon += 1;
      }
      if (
        row.event_type === "view" &&
        row.property_id &&
        !viewedSet.has(row.property_id)
      ) {
        viewedSet.add(row.property_id);
        viewedIds.push(row.property_id);
      }
    }

    out[shareId] = {
      opens: openVisitors.size + openAnon,
      views: viewedIds.length,
      contacts: contactVisitors.size + contactAnon,
      lastOpenAt,
      viewed: viewedIds.map((id) => ({
        id,
        title: titles[id] ?? "комплекс",
      })),
    };
  }
  return out;
}

export function shareStatsLabel(stats: CatalogShareStats): string {
  if (stats.opens === 0 && stats.views === 0 && stats.contacts === 0) {
    return "ещё не открывали";
  }
  const parts = [`открыли ${stats.opens}`];
  if (stats.views === 1 && stats.viewed[0]) {
    parts.push(`смотрели ${stats.viewed[0].title}`);
  } else if (stats.views > 1) {
    parts.push(`смотрели ${stats.views} ЖК`);
  }
  if (stats.contacts > 0) {
    parts.push(`написали ${stats.contacts}`);
  }
  return parts.join(" · ");
}

export function complexCountLabel(count: number) {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return `${count} комплекс`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
    return `${count} комплекса`;
  }
  return `${count} комплексов`;
}

export function shareInvalidCopy() {
  return {
    title: "Ссылка больше не действует",
    description:
      "Подборка закрыта или срок истек. Попросите агента прислать новую ссылку.",
  };
}

export type OpenCatalogShareOk = {
  ok: true;
  title: string | null;
  expires_at: string;
  agent: ShareAgent | null;
  properties: Property[];
};

export type OpenCatalogShareErr = {
  ok: false;
  reason: "invalid" | "missing" | "revoked" | "expired";
};

export type OpenCatalogShareResult = OpenCatalogShareOk | OpenCatalogShareErr;

export function parseOpenCatalogShare(data: unknown): OpenCatalogShareResult {
  if (!data || typeof data !== "object") {
    return { ok: false, reason: "invalid" };
  }
  const row = data as Record<string, unknown>;
  if (row.ok !== true) {
    const reason = row.reason;
    if (
      reason === "missing" ||
      reason === "revoked" ||
      reason === "expired" ||
      reason === "invalid"
    ) {
      return { ok: false, reason };
    }
    return { ok: false, reason: "invalid" };
  }
  if (!Array.isArray(row.properties)) {
    return { ok: false, reason: "invalid" };
  }
  return {
    ok: true,
    title: typeof row.title === "string" ? row.title : null,
    expires_at: typeof row.expires_at === "string" ? row.expires_at : "",
    agent: parseShareAgent(row.agent),
    properties: row.properties as Property[],
  };
}
