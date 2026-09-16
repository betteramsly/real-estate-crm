"use client";

import { useState } from "react";
import { Check, ChevronDown, Circle, ExternalLink, FileText, MapPin } from "lucide-react";
import {
  LightboxPhotos,
  PricePhotos,
} from "@/components/catalog/photo-gallery";
import { InternalLock } from "@/components/catalog/internal-lock";
import { RichText } from "@/components/catalog/rich-text";
import {
  CATALOG_MATERIAL_ITEMS,
  catalogLocationLabel,
  catalogLocationPhotos,
  catalogMaterialStatus,
  catalogPricePhotos,
  compactAbout,
  compactFacts,
  compactTermGroups,
  completionLabel,
  formatAboutBlocks,
  getCatalog,
  looksLikeUrl,
  visibleDocuments,
} from "@/lib/catalog";
import { cn } from "@/lib/utils";
import type { Property } from "@/lib/types";

function Section({
  title,
  defaultOpen,
  children,
  className,
}: {
  title: string;
  defaultOpen: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section
      className={cn(
        "flex h-full flex-col overflow-hidden rounded-2xl border bg-card",
        className,
      )}
    >
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between gap-3 px-5 py-3.5 text-left md:cursor-default md:pointer-events-none"
      >
        <h2 className="text-base font-semibold tracking-tight">{title}</h2>
        <ChevronDown
          className={cn(
            "h-5 w-5 text-muted-foreground transition-transform md:hidden",
            open && "rotate-180",
          )}
        />
      </button>
      <div className={cn("flex-1 px-5 pb-5", !open && "hidden md:block")}>
        {children}
      </div>
    </section>
  );
}

function MaterialsChecklist({ property }: { property: Property }) {
  const status = catalogMaterialStatus(property);

  return (
    <section className="rounded-2xl border bg-card px-5 py-4">
      <h2 className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
        Материалы
      </h2>
      <ul className="mt-3 grid gap-2 sm:grid-cols-3">
        {CATALOG_MATERIAL_ITEMS.map((item) => {
          const ok = status[item.id];
          return (
            <li key={item.id} className="flex min-h-8 items-center gap-2.5 text-sm">
              {ok ? (
                <Check className="h-4 w-4 shrink-0 text-gold" />
              ) : (
                <Circle className="h-4 w-4 shrink-0 text-muted-foreground" />
              )}
              <span className={ok ? "font-medium" : "text-muted-foreground"}>
                {ok ? item.present : item.missing}
              </span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function TermTable({
  groups,
  heading,
}: {
  groups: {
    title: string;
    items: { label: string; value: string }[];
    note?: string;
  }[];
  heading: string;
}) {
  return (
    <div className="space-y-4">
      {groups.map((group) => (
        <div key={group.title} className="space-y-2">
          {group.title && group.title !== heading ? (
            <h3 className="text-sm font-medium text-muted-foreground">
              {group.title}
            </h3>
          ) : null}
          {group.items.length ? (
            <div className="overflow-hidden rounded-xl border">
              {group.items.map((item, index) => (
                <div
                  key={`${item.label}-${item.value}`}
                  className={cn(
                    "flex items-center justify-between gap-3 px-3 py-2 text-sm",
                    index > 0 && "border-t",
                  )}
                >
                  <RichText
                    text={item.label}
                    className="text-muted-foreground"
                  />
                  <RichText text={item.value} className="font-medium" />
                </div>
              ))}
            </div>
          ) : null}
          {group.note ? (
            <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
              <RichText text={group.note} />
            </p>
          ) : null}
        </div>
      ))}
    </div>
  );
}

export function ComplexSections({
  property,
  presentMode,
}: {
  property: Property;
  presentMode: boolean;
}) {
  const catalog = getCatalog(property);
  const location = catalogLocationLabel(property);
  const completion = completionLabel(property);
  const installment = compactTermGroups(catalog.installment);
  const commercial = compactTermGroups(catalog.commercial);
  const used = [
    location,
    completion,
    property.installment_max,
    ...installment.flatMap((group) => [
      group.note,
      ...group.items.map((item) => `${item.label} ${item.value}`),
    ]),
  ];
  const about = compactAbout(catalog.about || property.description, used);
  const facts = compactFacts(catalog.facts, [about, location, ...used]);
  const aboutBlocks = formatAboutBlocks(about);
  const documents = visibleDocuments(catalog);
  const pricePhotos = catalogPricePhotos(property);
  const locationPhotos = catalogLocationPhotos(property);
  const rawAddress = catalog.location?.address?.trim() ?? "";
  const addressUrl = looksLikeUrl(rawAddress)
    ? /^https?:\/\//i.test(rawAddress)
      ? rawAddress
      : `https://${rawAddress}`
    : null;
  const mapUrl = catalog.location?.map_url || addressUrl;
  const hasLocation = Boolean(location || mapUrl || locationPhotos.length);
  const showInstallment = installment.length > 0;
  const showCommercial = commercial.length > 0;
  const showPrices = pricePhotos.length > 0;
  const service = presentMode ? null : (
    <InternalLock propertyId={property.id} presentMode={presentMode} />
  );
  const pairCommercialWithService =
    showCommercial && Boolean(service) && !showInstallment && !showPrices;

  return (
    <div className="space-y-4">
      {presentMode ? null : <MaterialsChecklist property={property} />}
      {about || facts.length ? (
        <Section title="О комплексе" defaultOpen>
          <div className="space-y-4">
            {aboutBlocks.map((block, index) =>
              block.type === "list" ? (
                <ul
                  key={`about-${index}`}
                  className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed"
                >
                  {block.items.map((item) => (
                    <li key={item}>
                      <RichText text={item} />
                    </li>
                  ))}
                </ul>
              ) : (
                <div key={`about-${index}`} className="space-y-3">
                  {block.items.map((item) => (
                    <p
                      key={item}
                      className="max-w-3xl text-sm leading-relaxed text-foreground/90"
                    >
                      <RichText text={item} />
                    </p>
                  ))}
                </div>
              ),
            )}
            {facts.length ? (
              <dl className="grid gap-3 sm:grid-cols-2">
                {facts.map((fact) => (
                  <div key={`${fact.label}-${fact.value}`} className="min-w-0">
                    <dt className="text-xs text-muted-foreground">{fact.label}</dt>
                    <dd className="text-sm leading-relaxed">
                      <RichText text={fact.value} />
                    </dd>
                  </div>
                ))}
              </dl>
            ) : null}
          </div>
        </Section>
      ) : null}

      {hasLocation ? (
        <Section title="Расположение" defaultOpen>
          <div className="space-y-4">
            {location || mapUrl ? (
              <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                {location ? (
                  <p className="inline-flex min-w-0 items-start gap-2 text-sm">
                    <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                    <RichText text={location} />
                  </p>
                ) : null}
                {mapUrl ? (
                  <a
                    href={mapUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-9 shrink-0 items-center gap-2 rounded-full border bg-background px-3.5 text-sm font-medium shadow-sm hover:bg-accent"
                  >
                    {/2gis/i.test(mapUrl) ? "Смотреть в 2ГИС" : "Открыть карту"}
                    <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
                  </a>
                ) : null}
              </div>
            ) : null}
            {locationPhotos.length ? (
              <LightboxPhotos
                photos={locationPhotos}
                alt={`${property.title} — расположение`}
              />
            ) : null}
          </div>
        </Section>
      ) : null}

      {documents.length ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {documents.map((doc) => (
            <a
              key={`${doc.title}-${doc.url}`}
              href={doc.url}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-between gap-3 rounded-2xl border bg-card px-4 py-3 text-sm hover:bg-accent"
            >
              <span className="inline-flex min-w-0 items-center gap-2">
                <FileText className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="truncate font-medium">{doc.title}</span>
              </span>
              <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground" />
            </a>
          ))}
        </div>
      ) : null}

      {showInstallment || (showCommercial && !pairCommercialWithService) ? (
        <div
          className={cn(
            "grid items-stretch gap-4",
            showInstallment && showCommercial && "md:grid-cols-2",
          )}
        >
          {showInstallment ? (
            <Section title="Рассрочка" defaultOpen>
              <TermTable groups={installment} heading="Рассрочка" />
            </Section>
          ) : null}
          {showCommercial ? (
            <Section title="Коммерция" defaultOpen>
              <TermTable groups={commercial} heading="Коммерция" />
            </Section>
          ) : null}
        </div>
      ) : null}

      {pairCommercialWithService ? (
        <div className="grid items-stretch gap-4 md:grid-cols-2">
          <Section title="Коммерция" defaultOpen>
            <TermTable groups={commercial} heading="Коммерция" />
          </Section>
          {service}
        </div>
      ) : pricePhotos.length === 1 && service ? (
        <div className="grid items-stretch gap-4 md:grid-cols-2">
          <Section title="Цены" defaultOpen>
            <PricePhotos photos={pricePhotos} alt={`${property.title} — цены`} />
          </Section>
          {service}
        </div>
      ) : (
        <>
          {showPrices ? (
            <Section title="Цены" defaultOpen>
              <PricePhotos
                photos={pricePhotos}
                alt={`${property.title} — цены`}
              />
            </Section>
          ) : null}
          {service}
        </>
      )}
    </div>
  );
}
