import * as React from "react";
import {
  ArrowRight,
  CheckCircle2,
  CircleDashed,
  Plus,
  RefreshCcw,
  Trash2,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  CLIENT_STATUS_LABELS,
  DEAL_STAGE_LABELS,
  PROPERTY_STATUS_LABELS,
  TASK_STATUS_LABELS,
} from "@/lib/constants";
import { formatRelative, initials } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import type {
  ActivityEntityType,
  ActivityType,
  ActivityWithActor,
  ClientStatus,
  DealStage,
  PropertyStatus,
  TaskStatus,
} from "@/lib/types";

interface ActivityTimelineProps {
  activities: ActivityWithActor[];
  emptyText?: string;
}

const TYPE_META: Record<
  ActivityType,
  { icon: React.ComponentType<{ className?: string }>; color: string }
> = {
  created: { icon: Plus, color: "bg-emerald-500/15 text-emerald-500" },
  updated: { icon: RefreshCcw, color: "bg-sky-500/15 text-sky-500" },
  deleted: { icon: Trash2, color: "bg-rose-500/15 text-rose-500" },
  stage_changed: {
    icon: ArrowRight,
    color: "bg-violet-500/15 text-violet-500",
  },
  status_changed: {
    icon: ArrowRight,
    color: "bg-amber-500/15 text-amber-500",
  },
  task_completed: {
    icon: CheckCircle2,
    color: "bg-emerald-500/15 text-emerald-500",
  },
  note_added: { icon: CircleDashed, color: "bg-muted text-muted-foreground" },
};

const ENTITY_LABELS: Record<ActivityEntityType, string> = {
  client: "клиента",
  deal: "сделку",
  property: "объект",
  task: "задачу",
};

function readableValue(
  entityType: ActivityEntityType,
  field: string,
  value: unknown,
): string {
  if (value === null || value === undefined || value === "") return "—";
  if (entityType === "deal" && field === "stage") {
    return DEAL_STAGE_LABELS[value as DealStage] ?? String(value);
  }
  if (entityType === "client" && field === "status") {
    return CLIENT_STATUS_LABELS[value as ClientStatus] ?? String(value);
  }
  if (entityType === "property" && field === "status") {
    return PROPERTY_STATUS_LABELS[value as PropertyStatus] ?? String(value);
  }
  if (entityType === "task" && field === "status") {
    return TASK_STATUS_LABELS[value as TaskStatus] ?? String(value);
  }
  return String(value);
}

function describe(activity: ActivityWithActor): React.ReactNode {
  const { type, entity_type: entityType, payload } = activity;
  const entityLabel = ENTITY_LABELS[entityType];

  switch (type) {
    case "created":
      return (
        <>
          создан(а) {entityLabel}
          {typeof payload?.title === "string" ? (
            <span className="font-medium"> «{payload.title}»</span>
          ) : null}
        </>
      );
    case "deleted":
      return <>удалён(а) {entityLabel}</>;
    case "stage_changed": {
      const from = readableValue(entityType, "stage", payload?.from);
      const to = readableValue(entityType, "stage", payload?.to);
      return (
        <>
          этап сделки:{" "}
          <span className="text-muted-foreground line-through">{from}</span>
          {" → "}
          <span className="font-medium">{to}</span>
        </>
      );
    }
    case "status_changed": {
      const from = readableValue(entityType, "status", payload?.from);
      const to = readableValue(entityType, "status", payload?.to);
      return (
        <>
          статус: <span className="text-muted-foreground line-through">{from}</span>
          {" → "}
          <span className="font-medium">{to}</span>
        </>
      );
    }
    case "task_completed":
      return (
        <>
          задача выполнена
          {typeof payload?.title === "string" ? (
            <span className="font-medium"> «{payload.title}»</span>
          ) : null}
        </>
      );
    case "updated": {
      const changes = (payload?.changes ?? {}) as Record<
        string,
        { from: unknown; to: unknown }
      >;
      const fields = Object.keys(changes);
      if (fields.length === 0) return <>обновил(а) {entityLabel}</>;
      return (
        <>
          обновил(а) {entityLabel}: {fields.length} {fields.length === 1 ? "поле" : "поля"}
        </>
      );
    }
    case "note_added":
      return <>добавил(а) заметку</>;
    default:
      return <>{type}</>;
  }
}

export function ActivityTimeline({
  activities,
  emptyText = "Пока нет событий",
}: ActivityTimelineProps) {
  if (activities.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        {emptyText}
      </p>
    );
  }

  return (
    <ol className="relative space-y-4 pl-6">
      <span
        aria-hidden="true"
        className="absolute left-3 top-1 bottom-1 w-px bg-border"
      />
      {activities.map((activity) => {
        const meta = TYPE_META[activity.type];
        const Icon = meta.icon;
        const actorName = activity.actor?.full_name ?? "Система";
        return (
          <li key={activity.id} className="relative">
            <span
              className={cn(
                "absolute -left-6 top-0 flex h-6 w-6 items-center justify-center rounded-full ring-2 ring-background",
                meta.color,
              )}
            >
              <Icon className="h-3 w-3" />
            </span>
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <Avatar className="h-6 w-6">
                {activity.actor?.avatar_url ? (
                  <AvatarImage src={activity.actor.avatar_url} alt={actorName} />
                ) : null}
                <AvatarFallback className="text-[10px]">
                  {initials(actorName)}
                </AvatarFallback>
              </Avatar>
              <span className="font-medium">{actorName}</span>
              <span className="text-muted-foreground">
                {describe(activity)}
              </span>
              <span className="text-xs text-muted-foreground">
                · {formatRelative(activity.created_at)}
              </span>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
