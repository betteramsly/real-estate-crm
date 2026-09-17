"use client";

import Image from "next/image";
import { Bookmark, Calendar, CreditCard, Images, MapPin } from "lucide-react";
import { PrefetchLink } from "@/components/prefetch-link";
import { Badge } from "@/components/ui/badge";
import { RelevanceStars } from "@/components/relevance-stars";
import { useOptionalPresentationBasket } from "@/components/catalog/presentation-basket";
import {
  catalogLocationLabel,
  catalogPhotos,
  completionLabel,
  hasCommercialCatalog,
  hasInstallmentCatalog,
} from "@/lib/catalog";
import { cn } from "@/lib/utils";
import type { Property } from "@/lib/types";

export function CatalogCard({
  property,
  priority = false,
  href,
  hideRelevance = false,
  guest = false,
}: {
  property: Property;
  priority?: boolean;
  href?: string;
  hideRelevance?: boolean;
  guest?: boolean;
}) {
  const basket = useOptionalPresentationBasket();
  const location = catalogLocationLabel(property);
  const commercial = hasCommercialCatalog(property);
  const installment = hasInstallmentCatalog(property);
  const photos = catalogPhotos(property);
  const cover = photos[0] ?? property.cover_url;
  const photoCount = photos.length;
  const completion = completionLabel(property);
  const selected = Boolean(basket?.has(property.id));
  const showBasket = Boolean(basket) && !guest;
  const cardHref = href ?? `/properties/${property.id}`;

  return (
    <article className="h-full overflow-hidden rounded-2xl border bg-card shadow-sm transition-[transform,box-shadow] duration-300 ease-luxury motion-reduce:transition-none hover:-translate-y-0.5 hover:shadow-lg motion-reduce:hover:translate-y-0">
      <div className="relative aspect-[16/10] w-full overflow-hidden bg-muted">
        <PrefetchLink href={cardHref} className="group absolute inset-0 block">
          {cover ? (
            <Image
              src={cover}
              alt={property.title}
              fill
              sizes="(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw"
              quality={70}
              priority={priority}
              className="z-0 object-cover transition-transform duration-500 ease-luxury motion-reduce:transition-none group-hover:scale-[1.04] motion-reduce:group-hover:scale-100"
            />
          ) : (
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_hsl(var(--muted-foreground)/0.12),_transparent_55%)]" />
          )}
          <div className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-b from-black/65 via-black/10 to-black/45" />
          <div className="pointer-events-none absolute inset-x-3 top-3 z-10 flex items-start justify-between gap-2">
            <div className="min-w-0 space-y-1.5">
              <h3 className="line-clamp-2 text-left text-lg font-semibold tracking-tight text-white drop-shadow">
                {property.title}
              </h3>
              <div className="flex flex-wrap gap-1.5">
                {property.developer ? (
                  <Badge className="bg-background/90 text-foreground backdrop-blur">
                    {property.developer}
                  </Badge>
                ) : null}
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
                {property.cash_payment ? (
                  <Badge className="bg-background/90 text-foreground backdrop-blur">
                    Наличный расчёт
                  </Badge>
                ) : null}
              </div>
            </div>
            <div className="flex shrink-0 flex-col items-end gap-1.5">
              {!hideRelevance && property.relevance ? (
                <RelevanceStars value={property.relevance} />
              ) : null}
              {photoCount > 1 ? (
                <div className="inline-flex items-center gap-1 rounded-full bg-background/90 px-2 py-0.5 text-xs backdrop-blur">
                  <Images className="h-3 w-3" />
                  {photoCount}
                </div>
              ) : null}
            </div>
          </div>
        </PrefetchLink>
        {showBasket && basket ? (
          <button
            type="button"
            aria-pressed={selected}
            aria-label={selected ? "Убрать из подборки" : "Добавить в подборку"}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              basket.toggle(property);
            }}
            className={cn(
              "absolute bottom-3 right-3 z-20 inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-xs font-medium shadow-sm backdrop-blur transition-colors duration-200 ease-luxury",
              selected
                ? "bg-russian text-gold"
                : "bg-background/90 text-foreground hover:bg-background",
            )}
          >
            <Bookmark className={cn("h-3.5 w-3.5", selected && "fill-gold")} />
            {selected ? "В подборке" : "В подборку"}
          </button>
        ) : null}
      </div>
      <PrefetchLink href={cardHref} className="block space-y-3 p-4">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
          {location ? (
            <span className="inline-flex min-w-0 items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 shrink-0" />
              <span className="truncate">{location}</span>
            </span>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2 text-xs">
          {completion ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1">
              <Calendar className="h-3 w-3" />
              {completion}
            </span>
          ) : null}
          {installment ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1">
              <CreditCard className="h-3 w-3" />
              рассрочка {property.installment_max ?? "есть"}
            </span>
          ) : null}
        </div>
      </PrefetchLink>
    </article>
  );
}
