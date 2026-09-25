"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import {
  DayFlag,
  DayPicker,
  SelectionState,
  UI,
  getDefaultClassNames,
} from "react-day-picker";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

export function Calendar({ className, classNames, ...props }: CalendarProps) {
  const defaultClassNames = getDefaultClassNames();
  const currentYear = new Date().getFullYear();

  return (
    <DayPicker
      showOutsideDays
      captionLayout="label"
      fixedWeeks
      startMonth={new Date(currentYear - 20, 0)}
      endMonth={new Date(currentYear + 10, 11)}
      className={cn("w-[304px] p-3", className)}
      classNames={{
        ...defaultClassNames,
        [UI.Months]: "relative flex flex-col gap-2 sm:flex-row",
        [UI.Month]: "w-full space-y-3",
        [UI.MonthCaption]:
          "relative flex min-h-9 items-center justify-center px-10",
        [UI.CaptionLabel]:
          "inline-flex h-8 items-center gap-1 px-2 text-sm font-semibold capitalize",
        [UI.Nav]:
          "absolute inset-x-0 top-0 z-10 flex h-9 items-center justify-between",
        [UI.Dropdowns]: "flex items-center gap-2",
        [UI.DropdownRoot]: "relative inline-flex",
        [UI.Dropdown]:
          "absolute inset-0 h-full w-full cursor-pointer opacity-0",
        [UI.MonthsDropdown]: "min-w-[108px]",
        [UI.YearsDropdown]: "min-w-[86px]",
        [UI.PreviousMonthButton]: cn(
          buttonVariants({ variant: "outline" }),
          "h-8 w-8 rounded-lg bg-transparent p-0 opacity-70 shadow-none hover:opacity-100",
        ),
        [UI.NextMonthButton]: cn(
          buttonVariants({ variant: "outline" }),
          "h-8 w-8 rounded-lg bg-transparent p-0 opacity-70 shadow-none hover:opacity-100",
        ),
        [UI.MonthGrid]: "w-full border-collapse space-y-1",
        [UI.Weekdays]: "flex",
        [UI.Weekday]:
          "w-10 rounded-md text-[0.72rem] font-medium uppercase text-muted-foreground",
        [UI.Week]: "mt-2 flex w-full",
        [UI.Day]: "h-10 w-10 p-0 text-center text-sm",
        [UI.DayButton]: cn(
          buttonVariants({ variant: "ghost" }),
          "h-9 w-9 rounded-lg p-0 font-normal shadow-none hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0",
        ),
        [SelectionState.selected]:
          "[&_button]:bg-primary [&_button]:font-semibold [&_button]:text-primary-foreground [&_button]:shadow-sm [&_button]:hover:bg-primary [&_button]:hover:text-primary-foreground [&_button]:focus:bg-primary [&_button]:focus:text-primary-foreground",
        [DayFlag.today]:
          "[&_button]:font-semibold [&_button]:ring-1 [&_button]:ring-ring/70",
        [DayFlag.outside]:
          "text-muted-foreground aria-selected:bg-accent/50 aria-selected:text-muted-foreground",
        [DayFlag.disabled]: "text-muted-foreground opacity-50",
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation, className: chevronClassName, ...chevronProps }) =>
          orientation === "left" ? (
            <ChevronLeft
              className={cn("h-4 w-4", chevronClassName)}
              {...chevronProps}
            />
          ) : (
            <ChevronRight
              className={cn("h-4 w-4", chevronClassName)}
              {...chevronProps}
            />
          ),
      }}
      {...props}
    />
  );
}
