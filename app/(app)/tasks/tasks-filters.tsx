"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  TASK_PRIORITY_LABELS,
  TASK_STATUS_LABELS,
} from "@/lib/constants";

export function TasksFilters() {
  const router = useRouter();
  const params = useSearchParams();
  const paramsKey = params.toString();
  const [isPending, startTransition] = React.useTransition();
  const [filters, setFilters] = React.useState({
    scope: params.get("scope") ?? "all",
    status: params.get("status") ?? "all",
    priority: params.get("priority") ?? "all",
  });

  React.useEffect(() => {
    const current = new URLSearchParams(paramsKey);
    setFilters({
      scope: current.get("scope") ?? "all",
      status: current.get("status") ?? "all",
      priority: current.get("priority") ?? "all",
    });
  }, [paramsKey]);

  const setParam = (
    key: "status" | "priority" | "scope",
    value: string,
  ) => {
    setFilters((current) => ({ ...current, [key]: value }));
    const next = new URLSearchParams(params.toString());
    if (!value || value === "all") next.delete(key);
    else next.set(key, value);
    const qs = next.toString();
    startTransition(() => {
      router.replace(`/tasks${qs ? `?${qs}` : ""}`, { scroll: false });
    });
  };

  const hasFilters = ["status", "priority", "scope"].some((k) =>
    params.get(k),
  );

  return (
    <div className="relative overflow-hidden rounded-xl border bg-card/70 p-3 shadow-sm">
      {isPending ? (
        <div className="absolute inset-x-0 top-0 h-0.5 animate-pulse bg-ring" />
      ) : null}

      <div className="flex min-h-6 items-center justify-between gap-3">
        <p className="text-sm font-medium">Фильтры задач</p>
        <div
          aria-live="polite"
          className="flex items-center gap-1.5 text-xs text-muted-foreground"
        >
          {isPending ? (
            <>
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Обновляем список…
            </>
          ) : null}
        </div>
      </div>

      <div className="mt-2 grid gap-3 sm:grid-cols-2 lg:grid-cols-[repeat(3,minmax(0,1fr))_auto] lg:items-end">
        <div className="space-y-1.5">
          <Label
            htmlFor="task-filter-scope"
            className="text-xs text-muted-foreground"
          >
            Исполнитель
          </Label>
          <Select
            value={filters.scope}
            onValueChange={(value) => setParam("scope", value)}
            disabled={isPending}
          >
            <SelectTrigger id="task-filter-scope" className="w-full">
              <SelectValue placeholder="Все задачи" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все задачи</SelectItem>
              <SelectItem value="mine">Только мои</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label
            htmlFor="task-filter-status"
            className="text-xs text-muted-foreground"
          >
            Статус
          </Label>
          <Select
            value={filters.status}
            onValueChange={(value) => setParam("status", value)}
            disabled={isPending}
          >
            <SelectTrigger id="task-filter-status" className="w-full">
              <SelectValue placeholder="Все статусы" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все статусы</SelectItem>
              {Object.entries(TASK_STATUS_LABELS).map(([key, label]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label
            htmlFor="task-filter-priority"
            className="text-xs text-muted-foreground"
          >
            Приоритет
          </Label>
          <Select
            value={filters.priority}
            onValueChange={(value) => setParam("priority", value)}
            disabled={isPending}
          >
            <SelectTrigger id="task-filter-priority" className="w-full">
              <SelectValue placeholder="Любой приоритет" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Любой приоритет</SelectItem>
              {Object.entries(TASK_PRIORITY_LABELS).map(([key, label]) => (
                <SelectItem key={key} value={key}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {hasFilters ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={isPending}
            onClick={() => {
              setFilters({ scope: "all", status: "all", priority: "all" });
              startTransition(() => {
                router.replace("/tasks", { scroll: false });
              });
            }}
            className="justify-self-start lg:mb-0.5"
          >
            <RotateCcw className="h-4 w-4" />
            Сбросить
          </Button>
        ) : null}
      </div>
    </div>
  );
}
