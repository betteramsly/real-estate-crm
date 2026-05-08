"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CLIENT_SOURCE_LABELS,
  CLIENT_STATUS_LABELS,
  DEAL_TYPE_LABELS,
} from "@/lib/constants";

export function ClientsFilters() {
  const router = useRouter();
  const params = useSearchParams();

  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(params.toString());
    if (!value || value === "all") next.delete(key);
    else next.set(key, value);
    const qs = next.toString();
    router.push(`/clients${qs ? `?${qs}` : ""}`);
  };

  const hasFilters = ["q", "status", "source", "deal_type"].some((k) =>
    params.get(k),
  );

  return (
    <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-3">
      <div className="relative flex-1">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          defaultValue={params.get("q") ?? ""}
          placeholder="Поиск по имени, телефону, email..."
          className="pl-9"
          onKeyDown={(e) => {
            if (e.key === "Enter")
              setParam("q", (e.target as HTMLInputElement).value);
          }}
        />
      </div>

      <Select
        value={params.get("status") ?? "all"}
        onValueChange={(v) => setParam("status", v)}
      >
        <SelectTrigger className="w-full md:w-44">
          <SelectValue placeholder="Статус" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Все статусы</SelectItem>
          {Object.entries(CLIENT_STATUS_LABELS).map(([k, v]) => (
            <SelectItem key={k} value={k}>
              {v}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={params.get("source") ?? "all"}
        onValueChange={(v) => setParam("source", v)}
      >
        <SelectTrigger className="w-full md:w-44">
          <SelectValue placeholder="Источник" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Все источники</SelectItem>
          {Object.entries(CLIENT_SOURCE_LABELS).map(([k, v]) => (
            <SelectItem key={k} value={k}>
              {v}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={params.get("deal_type") ?? "all"}
        onValueChange={(v) => setParam("deal_type", v)}
      >
        <SelectTrigger className="w-full md:w-44">
          <SelectValue placeholder="Тип сделки" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Все типы</SelectItem>
          {Object.entries(DEAL_TYPE_LABELS).map(([k, v]) => (
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
          onClick={() => router.push("/clients")}
          aria-label="Сбросить"
        >
          <X className="h-4 w-4" />
        </Button>
      ) : null}
    </div>
  );
}
