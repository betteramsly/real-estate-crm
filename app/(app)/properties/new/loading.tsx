import type { ReactNode } from "react";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { PageHeader } from "@/components/page-header";
import { Skeleton } from "@/components/ui/skeleton";

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="rounded-xl border bg-card p-6">
      <div className="space-y-1.5 pb-4">
        <p className="text-lg font-semibold leading-none">{title}</p>
        {hint ? <p className="text-sm text-muted-foreground">{hint}</p> : null}
      </div>
      {children}
    </div>
  );
}

function Field({
  label,
  className,
  tall,
}: {
  label: string;
  className?: string;
  tall?: boolean;
}) {
  return (
    <div className={className}>
      <p className="mb-2 text-sm font-medium">{label}</p>
      <Skeleton className={tall ? "h-24 w-full" : "h-9 w-full"} />
    </div>
  );
}

export default function NewPropertyLoading() {
  return (
    <>
      <Breadcrumbs
        items={[
          { label: "База ЖК", href: "/properties" },
          { label: "Новый объект" },
        ]}
      />
      <PageHeader title="Новый объект" />
      <div className="mx-auto max-w-3xl space-y-5">
        <Section
          title="Фотографии"
          hint="Первое фото станет обложкой в каталоге."
        >
          <p className="mb-2 text-sm font-medium">Фото комплекса</p>
          <Skeleton className="h-32 w-full rounded-2xl" />
        </Section>

        <Section title="Основное">
          <div className="grid gap-5 md:grid-cols-2">
            <Field label="Название ЖК" className="md:col-span-2" />
            <Field label="Застройщик" />
            <Field label="Актуальность" />
          </div>
        </Section>

        <Section title="Расположение">
          <div className="grid gap-5 md:grid-cols-2">
            <Field label="Город" />
            <Field label="Район" />
            <Field label="Улица и дом" className="md:col-span-2" />
            <Field label="Ссылка на карту" className="md:col-span-2" />
            <div className="md:col-span-2">
              <p className="mb-2 text-sm font-medium">Фото расположения</p>
              <Skeleton className="h-32 w-full rounded-2xl" />
            </div>
          </div>
        </Section>

        <Section title="О комплексе">
          <div className="space-y-5">
            <Field label="Описание" tall />
            <div>
              <p className="mb-2 text-sm font-medium">Характеристики</p>
              <Skeleton className="h-9 w-36" />
            </div>
          </div>
        </Section>

        <Section title="Сдача и условия">
          <div className="grid gap-5 md:grid-cols-2">
            <Field label="Год сдачи" />
            <Field label="Квартал сдачи" />
            <Field label="Рассрочка до" />
            <Field label="Материнский капитал" />
          </div>
        </Section>

        <div className="flex flex-wrap gap-2 border-t pt-3">
          <Skeleton className="h-9 w-40" />
          <Skeleton className="h-9 w-20" />
        </div>
      </div>
    </>
  );
}
