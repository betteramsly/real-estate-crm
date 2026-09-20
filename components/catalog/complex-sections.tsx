"use client";

import { useState, type ReactNode } from "react";
import {
  Check,
  ChevronDown,
  Circle,
  ExternalLink,
  FileText,
  MapPin,
} from "lucide-react";
import {
  LightboxPhotos,
  PricePhotos,
} from "@/components/catalog/photo-gallery";
import { InternalLock } from "@/components/catalog/internal-lock";
import { RichText } from "@/components/catalog/rich-text";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { safeExternalHref } from "@/lib/linkify";
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

function SectionHeading({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-2">
      <div className="min-w-0 space-y-0.5">
        <h2 className="font-display text-xl font-semibold tracking-tight md:text-[1.35rem]">
          {title}
        </h2>
        {description ? (
          <p className="max-w-2xl text-sm text-muted-foreground">{description}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

function MobileCollapsible({
  title,
  defaultOpen = true,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between gap-3 py-1 text-left md:pointer-events-none"
        aria-expanded={open}
      >
        <h2 className="font-display text-xl font-semibold tracking-tight md:text-[1.35rem]">
          {title}
        </h2>
        <ChevronDown
          className={cn(
            "h-4 w-4 text-muted-foreground transition-transform md:hidden",
            open && "rotate-180",
          )}
        />
      </button>
      <div className={cn("mt-4", !open && "hidden md:block")}>{children}</div>
    </div>
  );
}

function MaterialsBar({ property }: { property: Property }) {
  const status = catalogMaterialStatus(property);
  const ready = CATALOG_MATERIAL_ITEMS.filter((item) => status[item.id]).length;
  const total = CATALOG_MATERIAL_ITEMS.length;

  return (
    <div className="rounded-2xl border border-border/70 bg-card/70 px-4 py-3.5">
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
            Готовность материалов
          </p>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {ready === total
              ? "Всё необходимое на месте"
              : `${ready} из ${total} — дополните карточку`}
          </p>
        </div>
        <ul className="flex flex-wrap gap-2">
          {CATALOG_MATERIAL_ITEMS.map((item) => {
            const ok = status[item.id];
            return (
              <li key={item.id}>
                <span
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
                    ok
                      ? "border-gold/40 bg-gold/10 text-foreground"
                      : "border-border/80 bg-muted/40 text-muted-foreground",
                  )}
                >
                  {ok ? (
                    <Check className="h-3.5 w-3.5 text-gold" aria-hidden />
                  ) : (
                    <Circle
                      className="h-3.5 w-3.5 text-muted-foreground/50"
                      aria-hidden
                    />
                  )}
                  {ok ? item.present : item.missing}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

function QuickDocs({
  documents,
  mapUrl,
}: {
  documents: Array<{ title: string; href: string }>;
  mapUrl: string | null;
}) {
  if (!documents.length && !mapUrl) return null;

  return (
    <div className="space-y-2.5">
      <h2 className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
        Быстрый доступ
      </h2>
      <div className="flex flex-wrap gap-2">
        {mapUrl ? (
          <Button asChild variant="outline" size="sm" className="h-9">
            <a href={mapUrl} target="_blank" rel="noreferrer">
              <MapPin className="h-3.5 w-3.5" />
              {/2gis/i.test(mapUrl) ? "2ГИС" : "Карта"}
              <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
            </a>
          </Button>
        ) : null}
        {documents.map((doc) => (
          <Button
            key={`${doc.title}-${doc.href}`}
            asChild
            variant="secondary"
            size="sm"
            className="h-9"
          >
            <a href={doc.href} target="_blank" rel="noreferrer">
              <FileText className="h-3.5 w-3.5" />
              <span className="max-w-[12rem] truncate">{doc.title}</span>
              <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
            </a>
          </Button>
        ))}
      </div>
    </div>
  );
}

function splitFactLine(line: string) {
  const match = line.match(/^([^:]{1,36}):\s*(.+)$/);
  if (!match) return null;
  return { label: match[1].trim(), value: match[2].trim() };
}

function AboutContent({
  aboutBlocks,
  facts,
  presentMode,
  clientChess,
}: {
  aboutBlocks: Array<{ type: "p" | "list"; items: string[] }>;
  facts: { label: string; value: string }[];
  presentMode: boolean;
  clientChess: boolean;
}) {
  const fromLists = aboutBlocks.flatMap((block) =>
    block.type === "list"
      ? block.items.map((item) => ({ raw: item, fact: splitFactLine(item) }))
      : [],
  );
  const factRows = [
    ...fromLists
      .filter((row) => row.fact)
      .map((row) => row.fact as { label: string; value: string }),
    ...facts,
  ];
  const noteLines = [
    ...fromLists.filter((row) => !row.fact).map((row) => row.raw),
    ...aboutBlocks.flatMap((block) => (block.type === "p" ? block.items : [])),
  ];

  return (
    <div className="space-y-5">
      {factRows.length ? (
        <dl className="flex flex-wrap gap-2">
          {factRows.map((fact) => (
            <div
              key={`${fact.label}-${fact.value}`}
              className="inline-flex min-w-[7.5rem] flex-col rounded-xl border border-border/60 bg-muted/30 px-3.5 py-2.5"
            >
              <dt className="text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
                {fact.label}
              </dt>
              <dd className="mt-0.5 text-sm font-medium leading-snug">
                <RichText
                  text={fact.value}
                  clientLinks={presentMode}
                  clientChess={clientChess}
                />
              </dd>
            </div>
          ))}
        </dl>
      ) : null}

      {noteLines.length ? (
        <ul
          className={cn(
            "space-y-3",
            factRows.length > 0 && "border-t border-border/50 pt-5",
          )}
        >
          {noteLines.map((item) => (
            <li
              key={item}
              className="relative max-w-3xl pl-4 text-sm leading-relaxed text-foreground/90 before:absolute before:left-0 before:top-[0.55em] before:h-1 before:w-1 before:rounded-full before:bg-gold/80"
            >
              <RichText
                text={item}
                clientLinks={presentMode}
                clientChess={clientChess}
              />
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function TermTable({
  groups,
  heading,
  clientLinks = false,
  clientChess = true,
}: {
  groups: {
    title: string;
    items: { label: string; value: string }[];
    note?: string;
  }[];
  heading: string;
  clientLinks?: boolean;
  clientChess?: boolean;
}) {
  return (
    <div className="flex h-full flex-col gap-3">
      {groups.map((group) => (
        <div key={group.title} className="flex min-h-0 flex-1 flex-col gap-2">
          {group.title && group.title !== heading ? (
            <h3 className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
              {group.title}
            </h3>
          ) : null}
          {group.items.length ? (
            <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
              <table className="w-full text-sm">
                <tbody>
                  {group.items.map((item, index) => (
                    <tr
                      key={`${item.label}-${item.value}`}
                      className={cn(
                        "border-b border-border/60 last:border-b-0",
                        index % 2 === 1 && "bg-muted/35",
                      )}
                    >
                      <th
                        scope="row"
                        className="max-w-[65%] px-3 py-2 text-left font-normal text-muted-foreground"
                      >
                        <RichText
                          text={item.label}
                          clientLinks={clientLinks}
                          clientChess={clientChess}
                        />
                      </th>
                      <td className="px-3 py-2 text-right font-medium tabular-nums">
                        <RichText
                          text={item.value}
                          clientLinks={clientLinks}
                          clientChess={clientChess}
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
          {group.note ? (
            <p className="mt-auto pt-1 text-sm leading-relaxed text-muted-foreground">
              <RichText
                text={group.note}
                clientLinks={clientLinks}
                clientChess={clientChess}
              />
            </p>
          ) : null}
        </div>
      ))}
    </div>
  );
}

function LocationPanel({
  property,
  location,
  mapUrl,
  locationPhotos,
  presentMode,
  clientChess,
}: {
  property: Property;
  location: string;
  mapUrl: string | null;
  locationPhotos: string[];
  presentMode: boolean;
  clientChess: boolean;
}) {
  return (
    <div className="space-y-4 rounded-2xl border border-border/70 bg-card/60 p-4 md:p-5 lg:sticky lg:top-4">
      <div className="space-y-1">
        <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
          Расположение
        </p>
        {location ? (
          <p className="text-base font-medium leading-snug tracking-tight">
            <span className="mr-2 inline-flex align-middle text-muted-foreground">
              <MapPin className="h-4 w-4" aria-hidden />
            </span>
            <RichText
              text={location}
              clientLinks={presentMode}
              clientChess={clientChess}
            />
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">Адрес не указан</p>
        )}
      </div>

      {mapUrl ? (
        <Button asChild variant="outline" className="w-full">
          <a href={mapUrl} target="_blank" rel="noreferrer">
            {/2gis/i.test(mapUrl) ? "Смотреть в 2ГИС" : "Открыть карту"}
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </Button>
      ) : null}

      {locationPhotos.length ? (
        <LightboxPhotos
          photos={locationPhotos}
          alt={`${property.title} — расположение`}
          size="map"
        />
      ) : null}
    </div>
  );
}

function EmptyHint({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-xl border border-dashed border-border/70 px-4 py-6 text-center text-sm text-muted-foreground">
      {children}
    </p>
  );
}

export function ComplexSections({
  property,
  presentMode,
  showMaterials = false,
  guest = false,
}: {
  property: Property;
  presentMode: boolean;
  showMaterials?: boolean;
  guest?: boolean;
}) {
  const catalog = getCatalog(property);
  const clientChess = presentMode && !guest;
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
  const documents = visibleDocuments(catalog, {
    client: presentMode,
    chess: clientChess,
  }).flatMap((doc) => {
    const href = safeExternalHref(doc.url);
    return href ? [{ title: doc.title, href }] : [];
  });
  const pricePhotos = catalogPricePhotos(property);
  const locationPhotos = catalogLocationPhotos(property);
  const rawAddress = catalog.location?.address?.trim() ?? "";
  const addressUrl = looksLikeUrl(rawAddress)
    ? /^https?:\/\//i.test(rawAddress)
      ? rawAddress
      : `https://${rawAddress}`
    : null;
  const mapUrl = safeExternalHref(catalog.location?.map_url || addressUrl || "");
  const hasLocation = Boolean(location || mapUrl || locationPhotos.length);
  const showInstallment = installment.length > 0;
  const showCommercial = commercial.length > 0;
  const showPrices = pricePhotos.length > 0;
  const showAbout = Boolean(about || facts.length);
  const showTerms = showInstallment || showCommercial;
  const hasBody = showAbout || hasLocation || showTerms || showPrices;

  return (
    <div className="space-y-7">
      {showMaterials ? <MaterialsBar property={property} /> : null}

      <QuickDocs documents={documents} mapUrl={mapUrl} />

      {!hasBody ? (
        <EmptyHint>
          По этому комплексу пока нет описания, условий и материалов. Откройте
          редактирование ниже, чтобы заполнить карточку.
        </EmptyHint>
      ) : null}

      {showAbout || hasLocation ? (
        <div
          className={cn(
            "grid items-start gap-6 lg:gap-8",
            showAbout && hasLocation
              ? "lg:grid-cols-[minmax(0,1fr)_minmax(16rem,22rem)]"
              : "",
          )}
        >
          {showAbout ? (
            <section className="min-w-0 space-y-4">
              <MobileCollapsible title="О комплексе">
                <AboutContent
                  aboutBlocks={aboutBlocks}
                  facts={facts}
                  presentMode={presentMode}
                  clientChess={clientChess}
                />
              </MobileCollapsible>
            </section>
          ) : null}

          {hasLocation ? (
            <LocationPanel
              property={property}
              location={location}
              mapUrl={mapUrl}
              locationPhotos={locationPhotos}
              presentMode={presentMode}
              clientChess={clientChess}
            />
          ) : null}
        </div>
      ) : null}

      {showTerms ? (
        <>
          <Separator className="bg-border/60" />
          <div
            className={cn(
              "grid items-stretch gap-5",
              showInstallment && showCommercial && "lg:grid-cols-2",
            )}
          >
            {showInstallment ? (
              <section className="flex min-w-0 flex-col gap-2.5">
                <SectionHeading
                  title="Рассрочка"
                  description="Сроки и наценки, как в рабочем прайсе"
                />
                <TermTable
                  groups={installment}
                  heading="Рассрочка"
                  clientLinks={presentMode}
                  clientChess={clientChess}
                />
              </section>
            ) : null}
            {showCommercial ? (
              <section className="flex min-w-0 flex-col gap-2.5">
                <SectionHeading
                  title="Коммерция"
                  description="Помещения и условия по коммерции"
                />
                <TermTable
                  groups={commercial}
                  heading="Коммерция"
                  clientLinks={presentMode}
                  clientChess={clientChess}
                />
              </section>
            ) : null}
          </div>
        </>
      ) : null}

      {showPrices ? (
        <>
          <Separator className="bg-border/60" />
          <section className="space-y-4">
            <SectionHeading
              title="Цены"
              description="Скриншоты прайса — нажмите, чтобы увеличить"
            />
            <div className="flex justify-center rounded-2xl border border-border/60 bg-card/40 p-3 md:p-5">
              <PricePhotos
                photos={pricePhotos}
                alt={`${property.title} — цены`}
                size="price"
              />
            </div>
          </section>
        </>
      ) : null}

      {presentMode ? null : (
        <>
          <Separator className="bg-border/60" />
          <InternalLock propertyId={property.id} presentMode={presentMode} />
        </>
      )}
    </div>
  );
}
