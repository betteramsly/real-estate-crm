import {
  Building2,
  CheckSquare,
  Handshake,
  TrendingUp,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { Skeleton } from "@/components/ui/skeleton";

const KPI_CARDS = [
  { icon: <Users className="h-4 w-4" />, label: "Клиентов всего", hint: true },
  { icon: <Building2 className="h-4 w-4" />, label: "Объектов", hint: false },
  {
    icon: <TrendingUp className="h-4 w-4" />,
    label: "Сумма в воронке",
    hint: false,
  },
  {
    icon: <Handshake className="h-4 w-4" />,
    label: "Закрыто за 30 дней",
    hint: true,
  },
];

export default function DashboardLoading() {
  return (
    <>
      <PageHeader
        title="Панель"
        description="Сводка по работе агентства за последние 30 дней"
      />

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {KPI_CARDS.map((kpi) => (
          <Card key={kpi.label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {kpi.label}
              </CardTitle>
              <span className="rounded-md bg-primary/10 p-1.5 text-primary">
                {kpi.icon}
              </span>
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-24" />
              {kpi.hint ? <Skeleton className="mt-2 h-3 w-28" /> : null}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Сумма сделок по месяцам</CardTitle>
          </CardHeader>
          <CardContent>
            <Skeleton className="h-[260px] w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Воронка</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, index) => (
                <Skeleton key={index} className="h-7 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <CheckSquare className="h-4 w-4" />
              Задачи на ближайшее время
            </CardTitle>
            <Button variant="ghost" size="sm" disabled>
              Все задачи
            </Button>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <li
                  key={index}
                  className="flex items-start gap-3 rounded-lg border p-3"
                >
                  <div className="min-w-0 flex-1 space-y-2">
                    <Skeleton className="h-4 w-2/3" />
                    <div className="flex flex-wrap items-center gap-2">
                      <Skeleton className="h-5 w-16" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Последние клиенты
            </CardTitle>
            <Button variant="ghost" size="sm" disabled>
              Все клиенты
            </Button>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <li
                  key={index}
                  className="flex items-center justify-between gap-3 rounded-lg border p-3"
                >
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                  </div>
                  <Skeleton className="h-5 w-20" />
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
