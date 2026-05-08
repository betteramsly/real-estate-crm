import Image from "next/image";
import { Bed, MapPin, Ruler } from "lucide-react";
import { PrefetchLink } from "@/components/prefetch-link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  LISTING_TYPE_LABELS,
  PROPERTY_STATUS_LABELS,
  PROPERTY_STATUS_VARIANTS,
  PROPERTY_TYPE_LABELS,
} from "@/lib/constants";
import { formatCurrency } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import type { Property } from "@/lib/types";

export function PropertyCard({ property }: { property: Property }) {
  return (
    <PrefetchLink href={`/properties/${property.id}`} className="group block">
      <Card className="h-full overflow-hidden transition-shadow hover:shadow-md">
        <div className="relative aspect-[16/10] w-full overflow-hidden bg-muted">
          {property.cover_url ? (
            <Image
              src={property.cover_url}
              alt={property.title}
              fill
              sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
              className="object-cover transition-transform group-hover:scale-105"
            />
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              нет фото
            </div>
          )}
          <div className="absolute left-3 top-3 flex gap-1.5">
            <Badge variant="secondary">
              {LISTING_TYPE_LABELS[property.listing_type]}
            </Badge>
            <span
              className={cn(
                "inline-flex rounded-md px-2 py-0.5 text-xs font-medium",
                PROPERTY_STATUS_VARIANTS[property.status],
              )}
            >
              {PROPERTY_STATUS_LABELS[property.status]}
            </span>
          </div>
        </div>
        <CardContent className="space-y-3 p-4">
          <div className="flex items-start justify-between gap-3">
            <h3 className="line-clamp-2 font-semibold leading-tight">
              {property.title}
            </h3>
            <p className="whitespace-nowrap text-sm font-bold">
              {formatCurrency(property.price)}
              {property.listing_type === "rent" ? (
                <span className="text-xs text-muted-foreground"> /мес</span>
              ) : null}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <span>{PROPERTY_TYPE_LABELS[property.property_type]}</span>
            {property.area ? (
              <span className="inline-flex items-center gap-1">
                <Ruler className="h-3 w-3" />
                {property.area} м²
              </span>
            ) : null}
            {property.rooms ? (
              <span className="inline-flex items-center gap-1">
                <Bed className="h-3 w-3" />
                {property.rooms} комн.
              </span>
            ) : null}
          </div>
          {property.address ? (
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3 shrink-0" />
              <span className="truncate">
                {[property.city, property.district, property.address]
                  .filter(Boolean)
                  .join(", ")}
              </span>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </PrefetchLink>
  );
}
