"use client";

import { useState, useTransition } from "react";
import { Loader2 } from "lucide-react";
import { CatalogFilters } from "@/components/catalog/catalog-filters";
import {
  EMPTY_CATALOG_FILTER_EXTRAS,
  type CatalogFilterExtras,
} from "@/lib/catalog-filter-options";
import { cn } from "@/lib/utils";

export function CatalogExplorer({
  cities,
  districts,
  developers,
  years,
  installments,
  extras = EMPTY_CATALOG_FILTER_EXTRAS,
  canAddFilters = false,
  children,
}: {
  cities: string[];
  districts: string[];
  developers: string[];
  years: string[];
  installments: string[];
  extras?: CatalogFilterExtras;
  canAddFilters?: boolean;
  children: React.ReactNode;
}) {
  const [pending, startTransition] = useTransition();
  const [intent, setIntent] = useState<"apply" | "clear" | "search">("apply");
  const showOverlay = pending && intent !== "search";

  return (
    <CatalogFilters
      cities={cities}
      districts={districts}
      developers={developers}
      years={years}
      installments={installments}
      extras={extras}
      canAddFilters={canAddFilters}
      pending={pending}
      startTransition={startTransition}
      onPendingIntent={setIntent}
    >
      <div className="relative min-h-40">
        {showOverlay ? (
          <div className="absolute inset-0 z-20 flex animate-in fade-in items-start justify-center rounded-2xl bg-background/55 pt-20 backdrop-blur-[1px] duration-200 ease-luxury">
            <div className="inline-flex items-center gap-2 rounded-full border bg-background px-3 py-2 text-sm shadow-sm">
              <Loader2 className="h-4 w-4 animate-spin" />
              {intent === "clear" ? "Убираем фильтры" : "Применяем фильтры"}
            </div>
          </div>
        ) : null}
        <div
          className={cn(
            "transition-opacity duration-200 ease-luxury motion-reduce:transition-none",
            showOverlay && "pointer-events-none opacity-50",
          )}
        >
          {children}
        </div>
      </div>
    </CatalogFilters>
  );
}
