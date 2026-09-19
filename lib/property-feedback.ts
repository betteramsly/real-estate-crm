import type { PropertyFeedbackStatus } from "@/lib/types";

export const PROPERTY_FEEDBACK_STATUSES = [
  "open",
  "done",
  "tasked",
] as const satisfies readonly PropertyFeedbackStatus[];

export const PROPERTY_FEEDBACK_BODY_MIN = 20;
export const PROPERTY_FEEDBACK_BODY_MAX = 1000;
export const PROPERTY_FEEDBACK_CARD_LIMIT = 2;
export const PROPERTY_FEEDBACK_INBOX_ALL = 30;
export const TEAM_FEEDBACK_UNDONE_STATUSES = [
  "open",
  "tasked",
] as const satisfies readonly PropertyFeedbackStatus[];

export const PROPERTY_FEEDBACK_COLUMNS =
  "id, property_id, author_id, body, status, task_id, resolved_at, resolved_by, created_at, updated_at";

export const PROPERTY_FEEDBACK_TEAM_COLUMNS = `${PROPERTY_FEEDBACK_COLUMNS}, author:profiles!property_feedback_author_id_fkey(id, full_name, avatar_url), property:properties!property_feedback_property_id_fkey(id, title), resolver:profiles!property_feedback_resolved_by_fkey(id, full_name)`;

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const PROPERTY_FEEDBACK_STATUS_LABELS: Record<
  PropertyFeedbackStatus,
  string
> = {
  open: "Не сделано",
  done: "Сделано",
  tasked: "Не сделано",
};

export const PROPERTY_FEEDBACK_STATUS_VARIANTS: Record<
  PropertyFeedbackStatus,
  string
> = {
  open: "bg-primary/10 text-primary",
  done: "bg-grey/20 text-foreground",
  tasked: "bg-gold/20 text-foreground",
};

export const TEAM_FEEDBACK_FILTERS = ["open", "done"] as const;
export type TeamFeedbackFilter = (typeof TEAM_FEEDBACK_FILTERS)[number];

export const TEAM_FEEDBACK_FILTER_LABELS: Record<TeamFeedbackFilter, string> = {
  open: "Не сделанные",
  done: "Сделанные",
};

export function isPropertyFeedbackId(value: string) {
  return UUID_RE.test(value);
}

export function isPropertyFeedbackStatus(
  value: string,
): value is PropertyFeedbackStatus {
  return (PROPERTY_FEEDBACK_STATUSES as readonly string[]).includes(value);
}

export function canShowPropertyFeedback(input: {
  presentMode?: boolean;
  isShare?: boolean;
} = {}) {
  return !input.presentMode && !input.isShare;
}

export function parseTeamFeedbackFilter(
  value: string | undefined | null,
): TeamFeedbackFilter {
  if (
    value &&
    (TEAM_FEEDBACK_FILTERS as readonly string[]).includes(value)
  ) {
    return value as TeamFeedbackFilter;
  }
  return "open";
}

export function teamFeedbackStatusesForFilter(filter: TeamFeedbackFilter) {
  return filter === "done" ? (["done"] as const) : TEAM_FEEDBACK_UNDONE_STATUSES;
}

export function normalizePropertyFeedbackBody(value: string) {
  return value.trim();
}

export function validatePropertyFeedbackBody(
  value: string,
): { ok: true; body: string } | { ok: false; error: string } {
  const body = normalizePropertyFeedbackBody(value);
  if (body.length < PROPERTY_FEEDBACK_BODY_MIN) {
    return {
      ok: false,
      error: `Минимум ${PROPERTY_FEEDBACK_BODY_MIN} символов`,
    };
  }
  if (body.length > PROPERTY_FEEDBACK_BODY_MAX) {
    return {
      ok: false,
      error: `Максимум ${PROPERTY_FEEDBACK_BODY_MAX} символов`,
    };
  }
  return { ok: true, body };
}

export function clipPropertyFeedbackBody(body: string, max = 140) {
  const text = body.replace(/\s+/g, " ").trim();
  if (text.length <= max) return text;
  return `${text.slice(0, Math.max(1, max - 1)).trimEnd()}…`;
}

export function canResolvePropertyFeedback(status: PropertyFeedbackStatus) {
  return status !== "done";
}

export function canReopenPropertyFeedback(status: PropertyFeedbackStatus) {
  return status === "done";
}

export function teamMemberPath(userId: string) {
  return `/team/${userId}`;
}

export function teamInboxHref(filter: TeamFeedbackFilter) {
  if (filter === "open") return "/team";
  return `/team?status=${filter}`;
}

export function teamFeedbackFilterHref(
  userId: string,
  filter: TeamFeedbackFilter,
) {
  if (filter === "open") return teamMemberPath(userId);
  return `${teamMemberPath(userId)}?status=${filter}`;
}
