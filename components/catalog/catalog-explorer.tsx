"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { CatalogFilters } from "@/components/catalog/catalog-filters";
import { cn } from "@/lib/utils";

export function CatalogExplorer({
  cities,
  districts,
  developers,
  years,
  children,
}: {
  cities: string[];
  districts: string[];
  developers: string[];
  years: string[];
  children: React.ReactNode;
}) {
  const [pending, startTransition] = useTransition();
  const [clearing, setClearing] = useState(false);

  return (
    <CatalogFilters
      cities={cities}
      districts={districts}
      developers={developers}
      years={years}
      pending={pending}
      startTransition={startTransition}
      onPendingIntent={(intent) => setClearing(intent === "clear")}
    >
      <div className="relative min-h-40">
        {pending ? (
          <div className="absolute inset-0 z-20 flex items-start justify-center rounded-2xl bg-background/55 pt-20 backdrop-blur-[1px]">
            <div className="inline-flex items-center gap-2 rounded-full border bg-background px-3 py-2 text-sm shadow-sm">
              <Loader2 className="h-4 w-4 animate-spin" />
              {clearing ? "Убираем фильтры" : "Применяем фильтры"}
            </div>
          </div>
        ) : null}
        <div className={cn(pending && "pointer-events-none opacity-50")}>
          {children}
        </div>
      </div>
    </CatalogFilters>
  );
}
