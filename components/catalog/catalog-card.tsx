import Image from "next/image";
import { Building, Calendar, CreditCard, MapPin } from "lucide-react";
import { PrefetchLink } from "@/components/prefetch-link";
import { Badge } from "@/components/ui/badge";
import { RELEVANCE_LABELS } from "@/lib/constants";
import {
  catalogLocationLabel,
  hasCommercialCatalog,
  hasInstallmentCatalog,
} from "@/lib/catalog";
import { cn } from "@/lib/utils";
import type { Property } from "@/lib/types";

export function CatalogCard({ property }: { property: Property }) {
  const location = catalogLocationLabel(property);
  const commercial = hasCommercialCatalog(property);
  const installment = hasInstallmentCatalog(property);

  return (
    <PrefetchLink href={`/properties/${property.id}`} className="group block">
      <article className="h-full overflow-hidden rounded-2xl border bg-card shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-lg">
        <div className="relative aspect-[16/10] w-full overflow-hidden bg-muted">
          {property.cover_url ? (
            <Image
              src={property.cover_url}
              alt={property.title}
              fill
              sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
              className="object-cover transition-transform duration-500 group-hover:scale-[1.04]"
            />
          ) : (
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_hsl(var(--muted-foreground)/0.12),_transparent_55%)]" />
          )}
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/55 to-transparent" />
          <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
            {commercial ? (
              <Badge className="bg-background/90 text-foreground backdrop-blur">
                Коммерция
              </Badge>
            ) : null}
            {property.maternity_capital ? (
              <Badge className="bg-background/90 text-foreground backdrop-blur">
                Мат. капитал
              </Badge>
            ) : null}
          </div>
          {property.relevance ? (
            <div className="absolute right-3 top-3 rounded-full bg-background/90 px-2 py-0.5 text-xs backdrop-blur">
              {RELEVANCE_LABELS[property.relevance]}
            </div>
          ) : null}
          <h3 className="absolute inset-x-3 bottom-3 line-clamp-2 text-lg font-semibold tracking-tight text-white drop-shadow">
            {property.title}
          </h3>
        </div>
        <div className="space-y-3 p-4">
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            {property.developer ? (
              <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
                <Building className="h-3.5 w-3.5" />
                {property.developer}
              </span>
            ) : null}
            {location ? (
              <span className="inline-flex min-w-0 items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{location}</span>
              </span>
            ) : null}
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            {property.completion_year ? (
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1",
                )}
              >
                <Calendar className="h-3 w-3" />
                сдача {property.completion_year}
              </span>
            ) : null}
            {installment ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1">
                <CreditCard className="h-3 w-3" />
                рассрочка {property.installment_max ?? "есть"}
              </span>
            ) : null}
            {property.rooms ? (
              <span className="rounded-full bg-muted px-2.5 py-1">
                до {property.rooms} комн.
              </span>
            ) : null}
          </div>
        </div>
      </article>
    </PrefetchLink>
  );
}
