"use client";

import {
  TEAM_FEEDBACK_FILTER_LABELS,
  TEAM_FEEDBACK_FILTERS,
  type TeamFeedbackFilter,
} from "@/lib/property-feedback";
import { cn } from "@/lib/utils";

export function TeamFeedbackTabs({
  filter,
  onChange,
}: {
  filter: TeamFeedbackFilter;
  onChange: (value: TeamFeedbackFilter) => void;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {TEAM_FEEDBACK_FILTERS.map((value) => {
        const active = filter === value;
        return (
          <button
            key={value}
            type="button"
            onClick={() => onChange(value)}
            className={cn(
              "rounded-full px-3 py-1.5 text-sm transition-colors duration-200 ease-luxury",
              active
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground hover:bg-accent",
            )}
          >
            {TEAM_FEEDBACK_FILTER_LABELS[value]}
          </button>
        );
      })}
    </div>
  );
}
