import { Trash2 } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
        <div className="flex items-center gap-3">
          <Avatar className="h-12 w-12">
            <AvatarFallback>
              <Skeleton className="h-full w-full rounded-full" />
            </AvatarFallback>
          </Avatar>
          <div className="space-y-2">
            <Skeleton className="h-7 w-48" />
            <div className="flex flex-wrap items-center gap-2">
              <Skeleton className="h-5 w-24" />
              <Skeleton className="h-5 w-20" />
              <Skeleton className="h-4 w-32" />
            </div>
          </div>
        </div>
        <Button variant="outline" className="text-destructive" disabled>
          <Trash2 className="h-4 w-4" />
          Удалить
        </Button>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Обзор</TabsTrigger>
          <TabsTrigger value="edit">Редактировать</TabsTrigger>
          <TabsTrigger value="deals">Сделки</TabsTrigger>
          <TabsTrigger value="tasks">Задачи</TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Контакты</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Телефон</span>
              <Skeleton className="h-4 w-32" />
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Email</span>
              <Skeleton className="h-4 w-40" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Параметры</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Бюджет</span>
              <Skeleton className="h-4 w-40" />
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Тип</span>
              <Skeleton className="h-4 w-24" />
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Источник</span>
              <Skeleton className="h-4 w-28" />
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
