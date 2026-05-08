"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
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

  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(params.toString());
    if (!value || value === "all") next.delete(key);
    else next.set(key, value);
    const qs = next.toString();
    router.push(`/tasks${qs ? `?${qs}` : ""}`);
  };

  const hasFilters = ["status", "priority", "scope"].some((k) =>
    params.get(k),
  );

  return (
    <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-3">
      <Select
        value={params.get("scope") ?? "all"}
        onValueChange={(v) => setParam("scope", v)}
      >
        <SelectTrigger className="w-full md:w-44">
          <SelectValue placeholder="Кому" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Все задачи</SelectItem>
          <SelectItem value="mine">Только мои</SelectItem>
        </SelectContent>
      </Select>

      <Select
        value={params.get("status") ?? "all"}
        onValueChange={(v) => setParam("status", v)}
      >
        <SelectTrigger className="w-full md:w-44">
          <SelectValue placeholder="Статус" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Все статусы</SelectItem>
          {Object.entries(TASK_STATUS_LABELS).map(([k, v]) => (
            <SelectItem key={k} value={k}>
              {v}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={params.get("priority") ?? "all"}
        onValueChange={(v) => setParam("priority", v)}
      >
        <SelectTrigger className="w-full md:w-44">
          <SelectValue placeholder="Приоритет" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Любой</SelectItem>
          {Object.entries(TASK_PRIORITY_LABELS).map(([k, v]) => (
            <SelectItem key={k} value={k}>
              {v}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {hasFilters ? (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push("/tasks")}
          aria-label="Сбросить"
        >
          <X className="h-4 w-4" />
        </Button>
      ) : null}
    </div>
  );
}
