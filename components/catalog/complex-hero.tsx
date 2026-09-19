import type { ReactNode } from "react";
import { Calendar, CreditCard, MapPin } from "lucide-react";
import { PhotoGallery } from "@/components/catalog/photo-gallery";
import { Badge } from "@/components/ui/badge";
import { RelevanceStars } from "@/components/relevance-stars";
import {
  catalogLocationLabel,
  catalogPhotos,
  completionLabel,
  hasCommercialCatalog,
} from "@/lib/catalog";
import type { Property } from "@/lib/types";

export function ComplexHero({
  property,
  hideRelevance = false,
  overlay,
}: {
  property: Property;
  hideRelevance?: boolean;
  overlay?: ReactNode;
}) {
  const location = catalogLocationLabel(property);
  const photos = catalogPhotos(property);
  const completion = completionLabel(property);

  return (
    <section className="relative overflow-hidden rounded-3xl border bg-card shadow-sm">
      <PhotoGallery photos={photos} alt={property.title}>
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/75 to-transparent px-4 pb-4 pt-24 md:px-6 md:pb-5">
          <div className="flex items-end justify-between gap-3">
            <div className="min-w-0 space-y-2">
              <p className="text-[11px] font-medium uppercase tracking-[0.18em] text-white/70">
                Жилой комплекс
              </p>
              <h1 className="text-left text-3xl font-semibold tracking-tight text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.85)] md:text-4xl">
                {property.title}
              </h1>
            </div>
            {!hideRelevance && property.relevance ? (
              <RelevanceStars value={property.relevance} className="mb-1" />
            ) : null}
          </div>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {property.developer ? (
              <Badge className="rounded-full border-0 bg-background/90 px-2.5 py-0.5 text-xs font-medium text-foreground backdrop-blur">
                {property.developer}
              </Badge>
            ) : null}
            {hasCommercialCatalog(property) ? (
              <Badge className="rounded-full border-0 bg-background/90 px-2.5 py-0.5 text-xs font-medium text-foreground backdrop-blur">
                Коммерция
              </Badge>
            ) : null}
            {property.maternity_capital ? (
              <Badge className="rounded-full border-0 bg-background/90 px-2.5 py-0.5 text-xs font-medium text-foreground backdrop-blur">
                Мат. капитал
              </Badge>
            ) : null}
            {property.cash_payment ? (
              <Badge className="rounded-full border-0 bg-background/90 px-2.5 py-0.5 text-xs font-medium text-foreground backdrop-blur">
                Наличный расчёт
              </Badge>
            ) : null}
          </div>
          <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-white/95">
            {location ? (
              <span className="inline-flex min-w-0 items-center gap-1.5">
                <MapPin className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
                <span className="truncate">{location}</span>
              </span>
            ) : null}
            {completion ? (
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
                {completion}
              </span>
            ) : null}
            {property.installment_max ? (
              <span className="inline-flex items-center gap-1.5">
                <CreditCard className="h-4 w-4 shrink-0 opacity-80" aria-hidden />
                рассрочка до {property.installment_max}
              </span>
            ) : null}
          </div>
        </div>
      </PhotoGallery>
      {overlay ? (
        <div className="absolute left-3 top-3 z-20 max-w-[min(100%-5.5rem,18rem)]">
          {overlay}
        </div>
      ) : null}
    </section>
  );
}
