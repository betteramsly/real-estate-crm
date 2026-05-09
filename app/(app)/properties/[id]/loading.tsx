import { Bed, MapPin, Ruler, Trash2 } from "lucide-react";
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

export default function PropertyDetailLoading() {
  return (
    <>
      <Breadcrumbs
        items={[
          { label: "Объекты", href: "/properties" },
          { label: "Загрузка..." },
        ]}
      />

      <div className="grid gap-4 lg:grid-cols-[2fr_1fr]">
        <div className="space-y-4">
          <Skeleton className="aspect-[16/9] w-full rounded-xl" />
          <div className="flex flex-wrap items-center gap-2">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-5 w-20" />
            <Skeleton className="h-5 w-16" />
          </div>
          <Skeleton className="h-7 w-2/3" />
          <Skeleton className="h-7 w-32" />

          <Card>
            <CardHeader>
              <CardTitle>Описание</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-4 w-1/2" />
            </CardContent>
          </Card>
        </div>

        <Card className="h-fit">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Характеристики</CardTitle>
            <Button variant="outline" className="text-destructive" disabled>
              <Trash2 className="h-4 w-4" />
              Удалить
            </Button>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-2 text-muted-foreground">
                <Ruler className="h-4 w-4" /> Площадь
              </span>
              <Skeleton className="h-4 w-16" />
            </div>
            <div className="flex items-center justify-between">
              <span className="inline-flex items-center gap-2 text-muted-foreground">
                <Bed className="h-4 w-4" /> Комнат
              </span>
              <Skeleton className="h-4 w-10" />
            </div>
            <div className="flex items-start justify-between gap-3">
              <span className="inline-flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-4 w-4" /> Адрес
              </span>
              <Skeleton className="h-4 w-40" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Обзор</TabsTrigger>
          <TabsTrigger value="edit">Редактировать</TabsTrigger>
        </TabsList>
      </Tabs>
    </>
  );
}
