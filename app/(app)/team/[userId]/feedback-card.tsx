"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { PrefetchLink } from "@/components/prefetch-link";
import { Button } from "@/components/ui/button";
import {
  reopenPropertyFeedbackAction,
  resolvePropertyFeedbackAction,
} from "@/lib/actions/property-feedback";
import { formatDateTime } from "@/lib/formatters";
import {
  canReopenPropertyFeedback,
  canResolvePropertyFeedback,
  PROPERTY_FEEDBACK_STATUS_LABELS,
  PROPERTY_FEEDBACK_STATUS_VARIANTS,
} from "@/lib/property-feedback";
import { cn } from "@/lib/utils";
import type { PropertyFeedbackWithRelations } from "@/lib/types";

export function TeamFeedbackCard({
  item,
}: {
  item: PropertyFeedbackWithRelations;
}) {
  const router = useRouter();
  const [pending, start] = React.useTransition();
  const canResolve = canResolvePropertyFeedback(item.status);
  const canReopen = canReopenPropertyFeedback(item.status);

  const run = (
    action: () => Promise<{ ok: true } | { ok: false; error: string }>,
    success?: string,
  ) => {
    if (pending) return;
    start(async () => {
      const result = await action();
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      if (success) toast.success(success);
      router.refresh();
    });
  };

  return (
    <article className="space-y-3 rounded-2xl border bg-card p-4 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <PrefetchLink
          href={`/properties/${item.property_id}`}
          className="text-sm font-medium hover:underline"
        >
          {item.property?.title ?? "ЖК"}
        </PrefetchLink>
        <span
          className={cn(
            "rounded-full px-2 py-0.5 text-[11px] font-medium",
            PROPERTY_FEEDBACK_STATUS_VARIANTS[item.status],
          )}
        >
          {PROPERTY_FEEDBACK_STATUS_LABELS[item.status]}
        </span>
      </div>
      <p className="whitespace-pre-wrap text-sm leading-6">{item.body}</p>
      <p className="text-xs text-muted-foreground">
        {formatDateTime(item.created_at)}
        {item.status === "done" ? (
          <>
            {" · "}
            {item.resolver?.full_name
              ? `${item.resolver.full_name}, ${formatDateTime(item.resolved_at)}`
              : `закрыто ${formatDateTime(item.resolved_at)}`}
          </>
        ) : null}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          size="sm"
          variant={item.status === "done" ? "outline" : "default"}
          disabled={pending || (item.status === "done" ? !canReopen : !canResolve)}
          onClick={() => {
            if (item.status === "done") {
              run(() => reopenPropertyFeedbackAction(item.id));
              return;
            }
            run(() => resolvePropertyFeedbackAction(item.id), "Отмечено сделанным");
          }}
          className="min-w-[8.5rem]"
        >
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Check className="h-4 w-4" />
          )}
          {item.status === "done" ? "Вернуть" : "Сделано"}
        </Button>
      </div>
    </article>
  );
}
