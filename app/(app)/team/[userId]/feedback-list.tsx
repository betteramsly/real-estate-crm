"use client";

import * as React from "react";
import { MessageSquare } from "lucide-react";
import { EmptyState } from "@/components/ui/empty-state";
import { TeamFeedbackTabs } from "../feedback-tabs";
import { TeamFeedbackCard } from "./feedback-card";
import { type TeamFeedbackFilter } from "@/lib/property-feedback";
import type { PropertyFeedbackWithRelations } from "@/lib/types";

export function TeamMemberFeedbackList({
  undoneItems,
  doneItems,
}: {
  undoneItems: PropertyFeedbackWithRelations[];
  doneItems: PropertyFeedbackWithRelations[];
}) {
  const [filter, setFilter] = React.useState<TeamFeedbackFilter>("open");
  const items = filter === "done" ? doneItems : undoneItems;

  return (
    <>
      <TeamFeedbackTabs filter={filter} onChange={setFilter} />
      {items.length ? (
        <div className="space-y-3">
          {items.map((item) => (
            <TeamFeedbackCard key={item.id} item={item} />
          ))}
        </div>
      ) : (
        <EmptyState
          icon={<MessageSquare className="h-5 w-5" />}
          title={
            filter === "done"
              ? "Нет сделанных предложений"
              : "Нет несделанных предложений"
          }
          description="Заметки с карточек ЖК появятся здесь, как только сотрудник их отправит."
        />
      )}
    </>
  );
}
