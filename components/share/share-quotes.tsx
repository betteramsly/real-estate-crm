import { FloorPlanView } from "@/components/catalog/floor-plan-view";
import { formatCurrency } from "@/lib/formatters";
import { discountCaption, formatArea, quoteSummary } from "@/lib/apartment-quote";
import { cn } from "@/lib/utils";
import type { ApartmentQuote } from "@/lib/types";

function MoneyRow({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 px-4 py-2.5">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          "text-right text-sm font-medium tabular-nums",
          accent && "text-gold",
        )}
      >
        {value}
      </dd>
    </div>
  );
}

export function ShareQuotes({
  quotes,
  propertyTitles,
}: {
  quotes: ApartmentQuote[];
  propertyTitles?: Record<string, string>;
}) {
  if (!quotes.length) return null;

  return (
    <section className="space-y-4">
      <div className="space-y-1">
        <h2 className="font-display text-xl font-semibold tracking-tight md:text-[1.35rem]">
          {quotes.length > 1 ? "Расчёты квартир" : "Расчёт квартиры"}
        </h2>
        <p className="text-sm text-muted-foreground">
          Суммы зафиксированы на момент отправки подборки.
        </p>
      </div>
      <div className="space-y-4">
        {quotes.map((quote, index) => {
          const title =
            (quote.property_id && propertyTitles?.[quote.property_id]) ||
            quote.property_title ||
            "Квартира";
          const alt = `Планировка — ${title}`;
          const hasPlan = Boolean(quote.floor_plan_url);
          const discounts = quote.discounts ?? [];
          return (
            <article
              key={quote.id ?? quote.calculation_id ?? `${quote.property_id}-${index}`}
              className="overflow-hidden rounded-3xl border border-border/70 bg-card shadow-sm"
            >
              <div
                className={cn(
                  hasPlan && "md:grid md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]",
                )}
              >
                {hasPlan && quote.floor_plan_url ? (
                  <FloorPlanView
                    src={quote.floor_plan_url}
                    alt={alt}
                    className="h-full min-h-52 w-full md:min-h-[22rem]"
                    imageClassName="max-h-[32rem]"
                  />
                ) : null}
                <div className="flex min-w-0 flex-col gap-4 p-4 sm:p-5">
                  <div className="min-w-0 space-y-1">
                    <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                      {quote.term_label}
                      {quote.markup_pct > 0 ? ` · наценка ${quote.markup}` : ""}
                    </p>
                    <h3 className="truncate font-display text-2xl font-semibold tracking-tight">
                      {title}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {quoteSummary({ ...quote, property_title: null })}
                    </p>
                  </div>
                  {quote.developer_promo ? (
                    <div className="rounded-2xl border border-gold/40 bg-gold/10 px-4 py-3">
                      <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-gold">
                        Акция от застройщика
                      </p>
                      <p className="mt-1 text-sm leading-5">{quote.developer_promo}</p>
                    </div>
                  ) : null}
                  <dl className="overflow-hidden rounded-2xl border border-border/70">
                    <div className="divide-y divide-border/70">
                      <MoneyRow label="Площадь" value={formatArea(quote.area)} />
                      <MoneyRow
                        label="Цена за м²"
                        value={
                          quote.price_m2
                            ? `${formatCurrency(quote.price_m2)}/м²`
                            : "—"
                        }
                      />
                      <MoneyRow label="Стоимость" value={formatCurrency(quote.price)} />
                      <MoneyRow
                        label="Первый взнос"
                        value={formatCurrency(quote.down_payment)}
                      />
                      {quote.months > 0 ? (
                        <MoneyRow
                          label="Остаток"
                          value={formatCurrency(
                            Math.max(0, quote.price - quote.down_payment),
                          )}
                        />
                      ) : null}
                      <MoneyRow
                        label="Наценка на остаток"
                        value={quote.months > 0 ? quote.markup : "без наценки"}
                      />
                      {quote.months > 0 ? (
                        <MoneyRow
                          label="Остаток с наценкой"
                          value={formatCurrency(quote.remaining)}
                        />
                      ) : null}
                      {discounts.map((discount, discountIndex) => (
                        <MoneyRow
                          key={`${discount.label}-${discountIndex}`}
                          label={discountCaption(discount)}
                          value={`−${formatCurrency(discount.amount)}`}
                          accent
                        />
                      ))}
                      {discounts.length ? (
                        <MoneyRow
                          label={quote.months > 0 ? "Остаток со скидкой" : "Со скидкой"}
                          value={formatCurrency(
                            quote.months > 0
                              ? Math.max(0, quote.total - quote.down_payment)
                              : quote.total,
                          )}
                        />
                      ) : null}
                    </div>
                  </dl>
                  <div className="mt-auto overflow-hidden rounded-2xl border border-border/70 bg-muted/40">
                    <div className="divide-y divide-border/70">
                      {quote.months > 0 ? (
                        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 px-4 py-3">
                          <span className="text-sm text-muted-foreground">В месяц</span>
                          <span className="font-display text-xl font-semibold tabular-nums sm:text-2xl">
                            {formatCurrency(quote.monthly)}
                          </span>
                        </div>
                      ) : null}
                      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 px-4 py-3">
                        <span className="text-sm text-muted-foreground">Итого</span>
                        <span className="font-display text-xl font-semibold tabular-nums sm:text-2xl">
                          {formatCurrency(quote.total)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
