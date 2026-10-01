import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function AnalyticsLoading() {
  return (
    <>
      <PageHeader
        title="Аналитика"
        description="Результаты всей команды"
        actions={<Skeleton className="h-[106px] w-full sm:w-[430px]" />}
      />

      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <Skeleton key={index} className="h-24 rounded-xl" />
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <Card key={index}>
            <CardHeader>
              <Skeleton className="h-4 w-32" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-36" />
              <Skeleton className="mt-2 h-3 w-44" />
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Skeleton className="h-[410px] rounded-xl xl:col-span-2" />
        <Skeleton className="h-[410px] rounded-xl" />
      </div>
      <Skeleton className="h-[360px] rounded-xl" />
      <Skeleton className="h-[420px] rounded-xl" />
    </>
  );
}
