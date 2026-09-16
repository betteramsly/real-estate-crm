"use client";

import { useState } from "react";
import {
  ChevronDown,
  ExternalLink,
  FileText,
  MapPin,
  Table2,
} from "lucide-react";
import { InternalLock } from "@/components/catalog/internal-lock";
import { getCatalog, visibleDocuments } from "@/lib/catalog";
import { cn } from "@/lib/utils";
import type { CatalogDocumentKind, Property } from "@/lib/types";

function Section({
  title,
  defaultOpen,
  children,
}: {
  title: string;
  defaultOpen: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className="overflow-hidden rounded-2xl border bg-card">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left md:cursor-default md:pointer-events-none"
      >
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        <ChevronDown
          className={cn(
            "h-5 w-5 text-muted-foreground transition-transform md:hidden",
            open && "rotate-180",
          )}
        />
      </button>
      <div className={cn("px-5 pb-5", !open && "hidden md:block")}>{children}</div>
    </section>
  );
}

function documentIcon(kind: CatalogDocumentKind) {
  if (kind === "chess") return Table2;
  if (kind === "map") return MapPin;
  return FileText;
}

export function ComplexSections({
  property,
  presentMode,
}: {
  property: Property;
  presentMode: boolean;
}) {
  const catalog = getCatalog(property);
  const facts = catalog.facts ?? [];
  const installment = catalog.installment ?? [];
  const commercial = catalog.commercial ?? [];
  const documents = visibleDocuments(catalog);
  const about = catalog.about || property.description;

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
      <div className="space-y-4">
        {about || facts.length ? (
          <Section title="О комплексе" defaultOpen>
            {about ? (
              <p className="whitespace-pre-line text-sm leading-relaxed text-foreground/90">
                {about}
              </p>
            ) : null}
            {facts.length ? (
              <dl className="mt-4 grid gap-2 sm:grid-cols-2">
                {facts.map((fact) => (
                  <div
                    key={`${fact.label}-${fact.value}`}
                    className="rounded-xl bg-muted/60 px-3 py-2"
                  >
                    <dt className="text-xs text-muted-foreground">{fact.label}</dt>
                    <dd className="text-sm font-medium">{fact.value}</dd>
                  </div>
                ))}
              </dl>
            ) : null}
          </Section>
        ) : null}

        {installment.length ? (
          <Section title="Условия и рассрочка" defaultOpen>
            <div className="space-y-4">
              {installment.map((group) => (
                <div key={group.title} className="space-y-2">
                  <h3 className="text-sm font-medium text-muted-foreground">
                    {group.title}
                  </h3>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {group.items.map((item) => (
                      <div
                        key={`${item.label}-${item.value}`}
                        className="flex items-center justify-between rounded-xl border px-3 py-2.5"
                      >
                        <span className="text-sm">{item.label}</span>
                        <span className="text-sm font-semibold">{item.value}</span>
                      </div>
                    ))}
                  </div>
                  {group.note ? (
                    <p className="text-sm text-muted-foreground">{group.note}</p>
                  ) : null}
                </div>
              ))}
            </div>
          </Section>
        ) : null}

        {commercial.length ? (
          <Section title="Коммерция" defaultOpen={false}>
            <div className="space-y-4">
              {commercial.map((group) => (
                <div key={group.title} className="space-y-2">
                  <h3 className="text-sm font-medium text-muted-foreground">
                    {group.title}
                  </h3>
                  <div className="grid gap-2">
                    {group.items.map((item) => (
                      <div
                        key={`${item.label}-${item.value}`}
                        className="flex items-center justify-between rounded-xl border px-3 py-2.5"
                      >
                        <span className="text-sm">{item.label}</span>
                        <span className="text-sm font-semibold">{item.value}</span>
                      </div>
                    ))}
                  </div>
                  {group.note ? (
                    <p className="whitespace-pre-line text-sm text-muted-foreground">
                      {group.note}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          </Section>
        ) : null}
      </div>

      <div className="space-y-4">
        {catalog.location?.address || catalog.location?.map_url ? (
          <Section title="Расположение" defaultOpen>
            <div className="space-y-3">
              {catalog.location.address ? (
                <p className="inline-flex items-start gap-2 text-sm">
                  <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                  {catalog.location.address}
                </p>
              ) : null}
              {catalog.location.map_url ? (
                <a
                  href={catalog.location.map_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground"
                >
                  Открыть в 2ГИС
                  <ExternalLink className="h-4 w-4" />
                </a>
              ) : null}
            </div>
          </Section>
        ) : null}

        {documents.length ? (
          <Section title="Документы" defaultOpen={false}>
            <div className="grid gap-2">
              {documents.map((doc) => {
                const Icon = documentIcon(doc.kind);
                return (
                  <a
                    key={`${doc.title}-${doc.url}`}
                    href={doc.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex min-h-12 items-center justify-between gap-3 rounded-xl border px-3 py-3 text-sm hover:bg-accent"
                  >
                    <span className="inline-flex min-w-0 items-center gap-2">
                      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                      <span className="truncate font-medium">{doc.title}</span>
                    </span>
                    <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground" />
                  </a>
                );
              })}
            </div>
          </Section>
        ) : null}

        {presentMode ? null : (
          <InternalLock propertyId={property.id} presentMode={presentMode} />
        )}
      </div>
    </div>
  );
}
