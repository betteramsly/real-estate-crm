import { Briefcase, CalendarClock, Trash2, UserCircle2 } from "lucide-react";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function ClientDetailLoading() {
  return (
    <>
      <Breadcrumbs
        items={[
          { label: "Клиенты", href: "/clients" },
          { label: "Загрузка..." },
        ]}
      />

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex min-w-0 items-center gap-3">
          <Skeleton className="h-12 w-12 shrink-0 rounded-full" />
          <div className="min-w-0 space-y-2">
            <Skeleton className="h-7 w-48 max-w-full" />
            <div className="flex flex-wrap items-center gap-2">
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-4 w-24" />
            </div>
          </div>
        </div>
        <Button variant="outline" className="text-destructive" disabled>
          <Trash2 className="h-4 w-4" />
          Удалить
        </Button>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Card>
          <CardContent className="space-y-2 p-4">
            <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <UserCircle2 className="h-3.5 w-3.5" />
              Ответственный
            </p>
            <div className="flex items-center gap-2 pt-1">
              <Skeleton className="h-7 w-7 rounded-full" />
              <Skeleton className="h-4 w-32 max-w-full" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-2 p-4">
            <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <CalendarClock className="h-3.5 w-3.5" />
              Следующее действие
            </p>
            <Skeleton className="h-4 w-40 max-w-full" />
            <Skeleton className="h-3 w-24" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="space-y-2 p-4">
            <p className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <Briefcase className="h-3.5 w-3.5" />
              Активные сделки
            </p>
            <Skeleton className="h-8 w-8" />
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-2">
        <Skeleton className="h-8 w-36" />
        <Skeleton className="h-8 w-36" />
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Обзор</TabsTrigger>
          <TabsTrigger value="activity">Активность</TabsTrigger>
          <TabsTrigger value="deals">Сделки</TabsTrigger>
          <TabsTrigger value="tasks">Задачи</TabsTrigger>
          <TabsTrigger value="edit">Редактировать</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Контакты</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Телефон</span>
              <Skeleton className="h-4 w-32 max-w-[60%]" />
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Email</span>
              <Skeleton className="h-4 w-40 max-w-[60%]" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Параметры</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="shrink-0 text-muted-foreground">Бюджет</span>
              <Skeleton className="h-4 w-40 max-w-[60%]" />
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Тип</span>
              <Skeleton className="h-4 w-24" />
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-muted-foreground">Источник</span>
              <Skeleton className="h-4 w-28" />
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
