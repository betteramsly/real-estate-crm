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
      captionLayout="dropdown"
      fixedWeeks
      startMonth={new Date(currentYear - 20, 0)}
      endMonth={new Date(currentYear + 10, 11)}
      className={cn("w-[286px] p-3", className)}
      classNames={{
        ...defaultClassNames,
        [UI.Months]: "relative flex flex-col gap-2 sm:flex-row",
        [UI.Month]: "w-full space-y-4",
        [UI.MonthCaption]:
          "relative flex min-h-8 items-center justify-start pr-16",
        [UI.CaptionLabel]:
          "inline-flex h-8 items-center gap-1 rounded-md border border-input bg-background px-2 text-sm font-medium shadow-sm",
        [UI.Nav]: "absolute right-0 top-0 z-10 flex h-8 items-center gap-1",
        [UI.Dropdowns]: "flex items-center gap-2",
        [UI.DropdownRoot]: "relative inline-flex",
        [UI.Dropdown]:
          "absolute inset-0 h-full w-full cursor-pointer opacity-0",
        [UI.MonthsDropdown]: "min-w-[108px]",
        [UI.YearsDropdown]: "min-w-[86px]",
        [UI.PreviousMonthButton]: cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 bg-transparent p-0 opacity-70 hover:opacity-100",
        ),
        [UI.NextMonthButton]: cn(
          buttonVariants({ variant: "outline" }),
          "h-7 w-7 bg-transparent p-0 opacity-70 hover:opacity-100",
        ),
        [UI.MonthGrid]: "w-full border-collapse space-y-1",
        [UI.Weekdays]: "flex",
        [UI.Weekday]:
          "w-8 text-[0.8rem] font-normal text-muted-foreground rounded-md",
        [UI.Week]: "mt-2 flex w-full",
        [UI.Day]: "h-8 w-8 p-0 text-center text-sm",
        [UI.DayButton]: cn(
          buttonVariants({ variant: "ghost" }),
          "h-8 w-8 rounded-md p-0 font-normal hover:bg-accent hover:text-accent-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0",
        ),
        [SelectionState.selected]:
          "[&_button]:bg-primary [&_button]:text-primary-foreground [&_button]:hover:bg-primary [&_button]:hover:text-primary-foreground [&_button]:focus:bg-primary [&_button]:focus:text-primary-foreground",
        [DayFlag.today]:
          "[&_button]:bg-accent [&_button]:text-accent-foreground",
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
