"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import { CatalogCard } from "@/components/catalog/catalog-card";
import { CATALOG_PAGE_SIZE } from "@/lib/catalog";
import type { Property } from "@/lib/types";

export function CatalogGrid({
  properties,
  hrefBase,
  hideRelevance = false,
  guest = false,
  pageSize = CATALOG_PAGE_SIZE,
}: {
  properties: Property[];
  hrefBase?: string;
  hideRelevance?: boolean;
  guest?: boolean;
  pageSize?: number;
}) {
  const [visible, setVisible] = useState(pageSize);
  const sentinel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = sentinel.current;
    if (!node || visible >= properties.length) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        setVisible((current) =>
          Math.min(current + pageSize, properties.length),
        );
      },
      { rootMargin: "400px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [pageSize, properties.length, visible]);

  const shown = properties.slice(0, visible);

  return (
    <>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {shown.map((property, index) => (
          <CatalogCard
            key={property.id}
            property={property}
            priority={index < 3}
            href={hrefBase ? `${hrefBase}/${property.id}` : undefined}
            hideRelevance={hideRelevance}
            guest={guest}
          />
        ))}
      </div>
      {visible < properties.length ? (
        <div
          ref={sentinel}
          className="flex h-12 items-center justify-center text-sm text-muted-foreground"
        >
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Ещё {properties.length - visible} комплексов
        </div>
      ) : null}
    </>
  );
}