"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const FILTER_KEYS = [
  "q",
  "city",
  "developer",
  "completion_year",
  "installment",
  "maternity",
  "commercial",
  "large",
  "relevance",
] as const;

function Chip({
  active,
  children,
  onClick,
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "h-9 shrink-0 rounded-full border px-3 text-sm transition-colors",
        active
          ? "border-primary bg-primary text-primary-foreground"
          : "border-transparent bg-muted text-muted-foreground hover:bg-accent hover:text-accent-foreground",
      )}
    >
      {children}
    </button>
  );
}

export function CatalogFilters({
  cities,
  developers,
  years,
}: {
  cities: string[];
  developers: string[];
  years: string[];
}) {
  const router = useRouter();
  const params = useSearchParams();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(params.get("q") ?? "");

  const setParam = (key: string, value: string | null) => {
    const next = new URLSearchParams(params.toString());
    if (!value || value === "all") next.delete(key);
    else next.set(key, value);
    const qs = next.toString();
    router.push(`/properties${qs ? `?${qs}` : ""}`);
  };

  const toggleFlag = (key: string) => {
    setParam(key, params.get(key) === "1" ? null : "1");
  };

  const hasFilters = FILTER_KEYS.some((key) => params.get(key));

  const fields = (
    <div className="flex flex-col gap-4">
      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Город
        </p>
        <div className="flex flex-wrap gap-2">
          <Chip active={!params.get("city")} onClick={() => setParam("city", null)}>
            Все
          </Chip>
          {cities.map((city) => (
            <Chip
              key={city}
              active={params.get("city") === city}
              onClick={() =>
                setParam("city", params.get("city") === city ? null : city)
              }
            >
              {city}
            </Chip>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Сдача
        </p>
        <div className="flex flex-wrap gap-2">
          <Chip
            active={!params.get("completion_year")}
            onClick={() => setParam("completion_year", null)}
          >
            Все годы
          </Chip>
          {years.map((year) => (
            <Chip
              key={year}
              active={params.get("completion_year") === year}
              onClick={() =>
                setParam(
                  "completion_year",
                  params.get("completion_year") === year ? null : year,
                )
              }
            >
              {year}
            </Chip>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Застройщик
        </p>
        <Select
          value={params.get("developer") ?? "all"}
          onValueChange={(value) => setParam("developer", value)}
        >
          <SelectTrigger className="h-10 w-full rounded-full sm:w-72">
            <SelectValue placeholder="Все застройщики" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Все застройщики</SelectItem>
            {developers.map((developer) => (
              <SelectItem key={developer} value={developer}>
                {developer}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Условия
        </p>
        <div className="flex flex-wrap gap-2">
          <Chip
            active={params.get("installment") === "1"}
            onClick={() => toggleFlag("installment")}
          >
            Рассрочка
          </Chip>
          <Chip
            active={params.get("maternity") === "1"}
            onClick={() => toggleFlag("maternity")}
          >
            Мат. капитал
          </Chip>
          <Chip
            active={params.get("commercial") === "1"}
            onClick={() => toggleFlag("commercial")}
          >
            Коммерция
          </Chip>
          <Chip
            active={params.get("large") === "1"}
            onClick={() => toggleFlag("large")}
          >
            &gt;85 м²
          </Chip>
          {([1, 2, 3] as const).map((value) => (
            <Chip
              key={value}
              active={params.get("relevance") === String(value)}
              onClick={() =>
                setParam(
                  "relevance",
                  params.get("relevance") === String(value) ? null : String(value),
                )
              }
            >
              {"⭐".repeat(value)}
            </Chip>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="sticky top-14 z-30 -mx-4 space-y-3 border-b bg-background/95 px-4 py-3 backdrop-blur md:-mx-8 md:px-8">
      <div className="flex items-center gap-2">
        <div className="relative min-w-0 flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="ЖК, застройщик, район..."
            className="h-11 rounded-full pl-9"
            onKeyDown={(event) => {
              if (event.key === "Enter") setParam("q", query.trim() || null);
            }}
          />
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="h-11 rounded-full md:hidden">
              <SlidersHorizontal className="h-4 w-4" />
              Фильтры
            </Button>
          </DialogTrigger>
          <DialogContent className="fixed inset-x-0 bottom-0 top-auto max-h-[85vh] max-w-none translate-x-0 translate-y-0 overflow-y-auto rounded-t-3xl sm:rounded-t-3xl">
            <DialogHeader>
              <DialogTitle>Фильтры</DialogTitle>
            </DialogHeader>
            {fields}
            <Button className="mt-2 w-full" onClick={() => setOpen(false)}>
              Показать комплексы
            </Button>
          </DialogContent>
        </Dialog>
        {hasFilters ? (
          <Button
            variant="ghost"
            size="icon"
            className="h-11 w-11 rounded-full"
            onClick={() => {
              setQuery("");
              router.push("/properties");
            }}
            aria-label="Сбросить фильтры"
          >
            <X className="h-4 w-4" />
          </Button>
        ) : null}
      </div>
      <div className="hidden md:block">{fields}</div>
    </div>
  );
}
