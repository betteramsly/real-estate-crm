import Image from "next/image";
import { Bed, MapPin, Ruler } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { PrefetchLink } from "@/components/prefetch-link";
import { LISTING_TYPE_LABELS, PROPERTY_TYPE_LABELS } from "@/lib/constants";
import { formatCurrency } from "@/lib/formatters";
import type { MatchedProperty } from "@/lib/matching";

interface MatchedPropertiesProps {
  matches: MatchedProperty[];
  emptyText?: string;
}

export function MatchedProperties({
  matches,
  emptyText = "Подходящих объектов пока нет",
}: MatchedPropertiesProps) {
  if (matches.length === 0) {
    return (
      <Card>
        <CardContent className="space-y-3 p-6 text-center text-sm text-muted-foreground">
          <p>{emptyText}</p>
          <p className="text-xs">
            Уточните бюджет клиента или добавьте новые объекты, чтобы видеть
            подбор.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <ul className="grid gap-3 md:grid-cols-2">
      {matches.map(({ property, reasons }) => (
        <li key={property.id}>
          <PrefetchLink
            href={`/properties/${property.id}`}
            className="group block"
          >
            <Card className="h-full overflow-hidden transition-colors hover:border-primary">
              <div className="relative aspect-[16/9] w-full bg-muted">
                {property.cover_url ? (
                  <Image
                    src={property.cover_url}
                    alt={property.title}
                    fill
                    sizes="(min-width: 768px) 50vw, 100vw"
                    className="object-cover"
                  />
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
                    нет фото
                  </div>
                )}
              </div>
              <CardContent className="space-y-2 p-4">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant="secondary">
                    {PROPERTY_TYPE_LABELS[property.property_type]}
                  </Badge>
                  <Badge variant="outline">
                    {LISTING_TYPE_LABELS[property.listing_type]}
                  </Badge>
                </div>
                <h3 className="line-clamp-2 font-medium group-hover:underline">
                  {property.title}
                </h3>
                <p className="text-lg font-semibold">
                  {formatCurrency(property.price)}
                  {property.listing_type === "rent" ? (
                    <span className="text-xs font-normal text-muted-foreground">
                      {" "}
                      /мес
                    </span>
                  ) : null}
                </p>
                <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                  {property.area ? (
                    <span className="inline-flex items-center gap-1">
                      <Ruler className="h-3 w-3" />
                      {property.area} м²
                    </span>
                  ) : null}
                  {property.rooms ? (
                    <span className="inline-flex items-center gap-1">
                      <Bed className="h-3 w-3" />
                      {property.rooms}
                    </span>
                  ) : null}
                  {property.city ? (
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {property.city}
                    </span>
                  ) : null}
                </div>
                {reasons.length > 0 ? (
                  <div className="flex flex-wrap gap-1 pt-1">
                    {reasons.map((r) => (
                      <span
                        key={r}
                        className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-medium text-emerald-500"
                      >
                        {r}
                      </span>
                    ))}
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </PrefetchLink>
        </li>
      ))}
    </ul>
  );
}
