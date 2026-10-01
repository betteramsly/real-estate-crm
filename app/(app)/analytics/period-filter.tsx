"use client";

import * as React from "react";
import { format, parse } from "date-fns";
import { ru } from "date-fns/locale";
import { CalendarIcon, CalendarRange, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { PrefetchLink } from "@/components/prefetch-link";
import { Button, buttonVariants } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  ANALYTICS_PERIOD_LABELS,
  type AnalyticsDateRange,
  type AnalyticsPeriod,
} from "@/lib/analytics";
import { cn } from "@/lib/utils";

const MIN_DATE = new Date(2000, 0, 1);
const MAX_DATE = new Date(2100, 11, 31);

function parseInputDate(value: string) {
  return parse(value, "yyyy-MM-dd", new Date());
}

export function PeriodFilter({ range }: { range: AnalyticsDateRange }) {
  const router = useRouter();
  const [isPending, startTransition] = React.useTransition();
  const [pendingIntent, setPendingIntent] = React.useState<
    AnalyticsPeriod | "custom" | null
  >(null);
  const [from, setFrom] = React.useState(range.from);
  const [to, setTo] = React.useState(range.to);
  const [fromOpen, setFromOpen] = React.useState(false);
  const [toOpen, setToOpen] = React.useState(false);
  const fromDate = parseInputDate(from);
  const toDate = parseInputDate(to);
  const invalidRange = !from || !to || from > to;

  React.useEffect(() => {
    setFrom(range.from);
    setTo(range.to);
  }, [range.from, range.to]);

  React.useEffect(() => {
    if (!isPending) setPendingIntent(null);
  }, [isPending]);

  const applyCustomRange = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (invalidRange || isPending) return;

    const params = new URLSearchParams({ period: "custom", from, to });
    setPendingIntent("custom");
    startTransition(() => {
      router.push(`/analytics?${params.toString()}`, { scroll: false });
    });
  };

  return (
    <div className="flex w-full flex-col gap-2 md:w-auto md:items-end">
      <div className="flex flex-wrap gap-2" aria-label="Период аналитики">
        {(Object.keys(ANALYTICS_PERIOD_LABELS) as AnalyticsPeriod[]).map(
          (item) => {
            const href = `/analytics?period=${item}`;
            const itemPending = isPending && pendingIntent === item;

            return (
              <PrefetchLink
                key={item}
                href={href}
                className={cn(
                  buttonVariants({
                    variant:
                      item === range.selection ? "default" : "outline",
                    size: "sm",
                  }),
                  isPending && "pointer-events-none opacity-60",
                )}
                aria-current={item === range.selection ? "page" : undefined}
                aria-disabled={isPending}
                onClick={(event) => {
                  if (
                    event.metaKey ||
                    event.ctrlKey ||
                    event.shiftKey ||
                    event.altKey
                  ) {
                    return;
                  }
                  event.preventDefault();
                  if (isPending) return;
                  setPendingIntent(item);
                  startTransition(() => {
                    router.push(href, { scroll: false });
                  });
                }}
              >
                {itemPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : null}
                {ANALYTICS_PERIOD_LABELS[item]}
              </PrefetchLink>
            );
          },
        )}
      </div>

      <form
        className="relative flex flex-wrap items-end gap-2 overflow-hidden rounded-xl border bg-card/70 p-2 shadow-sm"
        aria-label="Произвольный период аналитики"
        aria-busy={isPending}
        onSubmit={applyCustomRange}
      >
        {isPending ? (
          <div className="absolute inset-x-0 top-0 h-0.5 animate-pulse bg-ring" />
        ) : null}
        <DatePicker
          label="С даты"
          value={fromDate}
          disabled={isPending}
          open={fromOpen}
          onOpenChange={setFromOpen}
          onSelect={(date) => {
            setFrom(format(date, "yyyy-MM-dd"));
            setFromOpen(false);
          }}
        />
        <DatePicker
          label="По дату"
          value={toDate}
          disabled={isPending}
          open={toOpen}
          onOpenChange={setToOpen}
          onSelect={(date) => {
            setTo(format(date, "yyyy-MM-dd"));
            setToOpen(false);
          }}
          disabledBefore={fromDate}
        />
        <Button
          type="submit"
          size="sm"
          variant={range.selection === "custom" ? "default" : "outline"}
          disabled={invalidRange || isPending}
          aria-describedby={invalidRange ? "analytics-range-error" : undefined}
        >
          {isPending && pendingIntent === "custom" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <CalendarRange className="h-4 w-4" />
          )}
          Показать
        </Button>
        <span className="sr-only" role="status" aria-live="polite">
          {isPending ? "Обновляем аналитику…" : ""}
        </span>
        {invalidRange ? (
          <p
            id="analytics-range-error"
            className="w-full text-xs text-destructive"
          >
            Начальная дата должна быть не позже конечной.
          </p>
        ) : null}
      </form>
    </div>
  );
}

function DatePicker({
  label,
  value,
  disabled,
  open,
  onOpenChange,
  onSelect,
  disabledBefore,
}: {
  label: string;
  value: Date;
  disabled: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (date: Date) => void;
  disabledBefore?: Date;
}) {
  return (
    <div className="grid gap-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <Popover open={open} onOpenChange={onOpenChange}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
            aria-label={`${label}: ${format(value, "d MMMM yyyy", { locale: ru })}`}
            className="w-[156px] justify-start rounded-lg bg-background px-3 text-left font-normal"
          >
            <CalendarIcon className="text-muted-foreground" />
            {format(value, "d MMM yyyy", { locale: ru })}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-auto overflow-hidden rounded-xl p-0 shadow-xl"
          align="start"
          sideOffset={8}
          collisionPadding={12}
        >
          <Calendar
            mode="single"
            required
            selected={value}
            defaultMonth={value}
            onSelect={(date) => {
              if (date) onSelect(date);
            }}
            disabled={[
              { before: disabledBefore ?? MIN_DATE },
              { after: MAX_DATE },
            ]}
            captionLayout="dropdown"
            startMonth={MIN_DATE}
            endMonth={MAX_DATE}
            locale={ru}
          />
          <div className="flex items-center justify-end border-t p-1.5">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => onSelect(new Date())}
            >
              Сегодня
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
