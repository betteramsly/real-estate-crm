import { BriefcaseBusiness } from "lucide-react";
import type { PropertyInternal } from "@/lib/types";

export function InternalDetails({ data }: { data?: PropertyInternal | null }) {
  const rows = [
    { label: "Комиссия", value: data?.commission },
    { label: "Инвесторские условия", value: data?.investor },
    { label: "Стоп-продажи", value: data?.stop_sales },
    { label: "Внутренние пометки", value: data?.notes },
  ].filter((row) => row.value?.trim());

  return (
    <section className="overflow-hidden rounded-2xl border border-border/70 bg-card/80">
      <div className="border-b border-border/60 px-5 py-3.5 md:px-6">
        <div className="inline-flex items-center gap-2.5">
          <BriefcaseBusiness className="h-4 w-4 text-gold" aria-hidden />
          <div>
            <h2 className="font-display text-lg font-semibold tracking-tight">
              Служебная информация
            </h2>
            <p className="text-xs text-muted-foreground">
              Доступна сотрудникам в рабочем кабинете
            </p>
          </div>
        </div>
      </div>

      <div className="px-5 py-5 md:px-6">
        {rows.length ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {rows.map((row) => (
              <div
                key={row.label}
                className="rounded-xl border border-border/60 bg-muted/40 px-4 py-3"
              >
                <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
                  {row.label}
                </p>
                <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed">
                  {row.value}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Служебных пометок по этому комплексу нет.
          </p>
        )}
      </div>
    </section>
  );
}
