import { Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/page-header";
import { Skeleton } from "@/components/ui/skeleton";

export default function SettingsLoading() {
  return (
    <>
      <PageHeader title="Настройки" description="Профиль и данные аккаунта" />
      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Профиль</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex flex-col gap-4 rounded-xl border bg-muted/30 p-4 sm:flex-row sm:items-center">
              <Skeleton className="h-20 w-20 rounded-full" />
              <div className="space-y-2">
                <Label className="text-base">Фото профиля</Label>
                <p className="text-sm text-muted-foreground">
                  Загрузите квадратное изображение до 3 МБ. Оно будет видно в
                  шапке и списке команды.
                </p>
                <span className="inline-flex h-9 cursor-not-allowed items-center justify-center gap-2 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium opacity-60 shadow-sm">
                  <Camera className="h-4 w-4" />
                  Выбрать фото
                </span>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Skeleton className="h-9 w-full" />
            </div>
            <div className="space-y-2">
              <Label>ФИО</Label>
              <Skeleton className="h-9 w-full" />
            </div>
            <div className="space-y-2">
              <Label>Телефон</Label>
              <Skeleton className="h-9 w-full" />
            </div>
            <div className="space-y-2">
              <Label>Роль</Label>
              <Skeleton className="h-9 w-full" />
            </div>
            <Button disabled>Сохранить</Button>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
