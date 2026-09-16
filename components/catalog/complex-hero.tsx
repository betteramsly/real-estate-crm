import Image from "next/image";
import { Building, Calendar, CreditCard, MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { RELEVANCE_LABELS } from "@/lib/constants";
import { catalogLocationLabel, hasCommercialCatalog } from "@/lib/catalog";
import type { Property } from "@/lib/types";

export function ComplexHero({ property }: { property: Property }) {
  const location = catalogLocationLabel(property);

  return (
    <section className="overflow-hidden rounded-3xl border bg-card shadow-sm">
      <div className="relative aspect-[16/10] w-full bg-muted md:aspect-[21/9]">
        {property.cover_url ? (
          <Image
            src={property.cover_url}
            alt={property.title}
            fill
            priority
            sizes="(min-width: 1280px) 1152px, 100vw"
            className="object-cover"
          />
        ) : (
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,_hsl(var(--muted-foreground)/0.14),_transparent_50%)]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
        <div className="absolute inset-x-0 bottom-0 space-y-3 p-5 md:p-8">
          <div className="flex flex-wrap gap-2">
            {property.developer ? (
              <Badge className="bg-background/90 text-foreground backdrop-blur">
                {property.developer}
              </Badge>
            ) : null}
            {hasCommercialCatalog(property) ? (
              <Badge className="bg-background/90 text-foreground backdrop-blur">
                Коммерция
              </Badge>
            ) : null}
            {property.maternity_capital ? (
              <Badge className="bg-background/90 text-foreground backdrop-blur">
                Мат. капитал
              </Badge>
            ) : null}
            {property.relevance ? (
              <Badge className="bg-background/90 text-foreground backdrop-blur">
                {RELEVANCE_LABELS[property.relevance]}
              </Badge>
            ) : null}
          </div>
          <h1 className="max-w-3xl text-3xl font-semibold tracking-tight text-white md:text-5xl">
            {property.title}
          </h1>
          <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm text-white/85">
            {location ? (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-4 w-4" />
                {location}
              </span>
            ) : null}
            {property.completion_year ? (
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="h-4 w-4" />
                сдача {property.completion_year}
              </span>
            ) : null}
            {property.installment_max ? (
              <span className="inline-flex items-center gap-1.5">
                <CreditCard className="h-4 w-4" />
                рассрочка до {property.installment_max}
              </span>
            ) : null}
            {property.rooms ? (
              <span className="inline-flex items-center gap-1.5">
                <Building className="h-4 w-4" />
                до {property.rooms} комн.
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
