import { Calendar, CreditCard, MapPin } from "lucide-react";
import { PhotoGallery } from "@/components/catalog/photo-gallery";
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
}: {
  property: Property;
  hideRelevance?: boolean;
}) {
  const location = catalogLocationLabel(property);
  const photos = catalogPhotos(property);
  const completion = completionLabel(property);

  return (
    <section className="overflow-hidden rounded-3xl border bg-card shadow-sm">
      <PhotoGallery photos={photos} alt={property.title}>
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black via-black/80 to-transparent px-4 pb-4 pt-20 md:px-6 md:pb-5">
          <div className="flex items-end justify-between gap-3">
            <h1 className="min-w-0 text-left text-3xl font-semibold tracking-tight text-white drop-shadow-[0_2px_10px_rgba(0,0,0,0.85)] md:text-4xl">
              {property.title}
            </h1>
            {!hideRelevance && property.relevance ? (
              <RelevanceStars value={property.relevance} className="mb-1" />
            ) : null}
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {property.developer ? (
              <span className="rounded-full bg-white px-2.5 py-0.5 text-xs font-medium text-zinc-950">
                {property.developer}
              </span>
            ) : null}
            {hasCommercialCatalog(property) ? (
              <span className="rounded-full bg-white px-2.5 py-0.5 text-xs font-medium text-zinc-950">
                Коммерция
              </span>
            ) : null}
            {property.maternity_capital ? (
              <span className="rounded-full bg-white px-2.5 py-0.5 text-xs font-medium text-zinc-950">
                Мат. капитал
              </span>
            ) : null}
          </div>
          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-white">
            {location ? (
              <span className="inline-flex items-center gap-1.5">
                <MapPin className="h-4 w-4" />
                {location}
              </span>
            ) : null}
            {completion ? (
              <span className="inline-flex items-center gap-1.5">
                <Calendar className="h-4 w-4" />
                {completion}
              </span>
            ) : null}
            {property.installment_max ? (
              <span className="inline-flex items-center gap-1.5">
                <CreditCard className="h-4 w-4" />
                рассрочка до {property.installment_max}
              </span>
            ) : null}
          </div>
        </div>
      </PhotoGallery>
    </section>
  );
}
