import { Breadcrumbs } from "@/components/breadcrumbs";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/page-header";
import { RequiredMark } from "@/components/required-mark";
import { Skeleton } from "@/components/ui/skeleton";

const FIELDS: {
  label: string;
  required?: boolean;
  full?: boolean;
  tall?: boolean;
}[] = [
  { label: "Название", required: true, full: true },
  { label: "Тип объекта" },
  { label: "Тип сделки" },
  { label: "Статус" },
  { label: "Цена, ₽", required: true },
  { label: "Площадь, м²" },
  { label: "Комнат" },
  { label: "Город" },
  { label: "Район" },
  { label: "Адрес", full: true },
  { label: "URL обложки", full: true },
  { label: "Ответственный" },
  { label: "Описание", full: true, tall: true },
];

export default function NewPropertyLoading() {
  return (
    <>
      <Breadcrumbs
        items={[
          { label: "Объекты", href: "/properties" },
          { label: "Новый объект" },
        ]}
      />
      <PageHeader title="Новый объект" />
      <Card>
        <CardContent className="grid gap-4 p-6 md:grid-cols-2">
          {FIELDS.map((field) => (
            <div
              key={field.label}
              className={`space-y-2 ${field.full ? "md:col-span-2" : ""}`}
            >
              <Label>
                {field.label} {field.required ? <RequiredMark /> : null}
              </Label>
              <Skeleton className={field.tall ? "h-24 w-full" : "h-9 w-full"} />
            </div>
          ))}
        </CardContent>
      </Card>
      <div className="flex flex-wrap gap-2">
        <Button disabled>Создать объект</Button>
        <Button variant="outline" disabled>
          Отмена
        </Button>
      </div>
    </>
  );
}
