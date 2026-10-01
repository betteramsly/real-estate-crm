import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { PageHeader } from "@/components/page-header";
import { Skeleton } from "@/components/ui/skeleton";

export default function TeamLoading() {
  return (
    <>
      <PageHeader
        title="Команда"
        description="Сотрудники и условия работы риелторов"
      />
      <div className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Сотрудники</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <div
                  key={index}
                  className="flex flex-col gap-3 rounded-lg border p-3 xl:flex-row xl:items-center xl:justify-between"
                >
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 rounded-full" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-40" />
                      <Skeleton className="h-3 w-56" />
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-9 w-36" />
                    <Skeleton className="h-9 w-32" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
