"use client";

import * as React from "react";
import { MessageSquare } from "lucide-react";
import { PrefetchLink } from "@/components/prefetch-link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { TeamFeedbackTabs } from "./feedback-tabs";
import { formatDate } from "@/lib/formatters";
import {
  clipPropertyFeedbackBody,
  teamMemberPath,
  type TeamFeedbackFilter,
} from "@/lib/property-feedback";
import type { PropertyFeedbackWithRelations } from "@/lib/types";

export function TeamFeedbackInbox({
  undoneCount,
  undoneItems,
  doneItems,
}: {
  undoneCount: number;
  undoneItems: PropertyFeedbackWithRelations[];
  doneItems: PropertyFeedbackWithRelations[];
}) {
  const [filter, setFilter] = React.useState<TeamFeedbackFilter>("open");
  const items = filter === "done" ? doneItems : undoneItems;

  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="space-y-1.5">
          <CardTitle>Предложения по базе</CardTitle>
          <CardDescription>
            {filter === "done"
              ? items.length
                ? "Закрытые правки по карточкам ЖК"
                : "Сделанных предложений пока нет"
              : undoneCount
                ? `${undoneCount} несделанных — агенты пишут, чего не хватает в карточках`
                : "Несделанных предложений пока нет"}
          </CardDescription>
        </div>
        <TeamFeedbackTabs filter={filter} onChange={setFilter} />
      </CardHeader>
      <CardContent>
        {items.length ? (
          <ul className="space-y-2">
            {items.map((item) => (
              <li key={item.id}>
                <PrefetchLink
                  href={teamMemberPath(item.author_id)}
                  className="block rounded-2xl border border-border/70 p-3 transition-colors duration-200 ease-luxury hover:bg-accent/40"
                >
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">
                      {item.author?.full_name ?? "Агент"}
                    </span>
                    <span>·</span>
                    <span>{item.property?.title ?? "ЖК"}</span>
                    <span>·</span>
                    <span>{formatDate(item.created_at)}</span>
                  </div>
                  <p className="mt-1 text-sm leading-5">
                    {clipPropertyFeedbackBody(item.body)}
                  </p>
                </PrefetchLink>
              </li>
            ))}
          </ul>
        ) : (
          <div className="flex items-center gap-3 rounded-2xl border border-dashed px-4 py-6 text-sm text-muted-foreground">
            <MessageSquare className="h-4 w-4 shrink-0" />
            {filter === "done"
              ? "Когда правку отметят сделанной, она появится здесь."
              : "Когда агент оставит правку на карточке ЖК, она появится здесь."}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
