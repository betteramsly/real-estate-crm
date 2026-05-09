import { Breadcrumbs } from "@/components/breadcrumbs";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/page-header";
import { RequiredMark } from "@/components/required-mark";
import { Skeleton } from "@/components/ui/skeleton";

export default function NewClientLoading() {
  return (
    <>
      <Breadcrumbs
        items={[
          { label: "Клиенты", href: "/clients" },
          { label: "Новый клиент" },
        ]}
      />
      <PageHeader
        title="Новый клиент"
        description="Заполните основные данные клиента"
      />
      <Card>
        <CardContent className="grid gap-4 p-6 md:grid-cols-2">
          <div className="space-y-2 md:col-span-2">
            <Label>
              ФИО клиента <RequiredMark />
            </Label>
            <Skeleton className="h-9 w-full" />
          </div>
          {[
            "Телефон",
            "Email",
            "Источник",
            "Статус",
            "Тип сделки",
            "Ответственный",
            "Бюджет от, ₽",
            "Бюджет до, ₽",
          ].map((label) => (
            <div key={label} className="space-y-2">
              <Label>{label}</Label>
              <Skeleton className="h-9 w-full" />
            </div>
          ))}
          <div className="space-y-2 md:col-span-2">
            <Label>Заметки</Label>
            <Skeleton className="h-24 w-full" />
          </div>
        </CardContent>
      </Card>
      <div className="flex flex-wrap gap-2">
        <Button disabled>Создать клиента</Button>
        <Button variant="outline" disabled>
          Отмена
        </Button>
      </div>
    </>
  );
}
