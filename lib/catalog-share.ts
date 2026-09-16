import type { Property } from "@/lib/types";

export const SHARE_TTL_DAYS = [1, 3, 7] as const;
export type ShareTtlDays = (typeof SHARE_TTL_DAYS)[number];

export const SHARE_MAX_PROPERTIES = 12;
export const SHARE_MAX_ACTIVE = 20;
export const SHARE_TOKEN_BYTES = 18;

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
    properties: row.properties as Property[],
  };
}
