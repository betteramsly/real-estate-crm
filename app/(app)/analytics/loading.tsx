import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export default function AnalyticsLoading() {
  return (
    <>
      <PageHeader
        title="Аналитика"
        description="Результаты всей команды"
        actions={
          <div className="flex w-full min-w-0 flex-col gap-2 md:w-auto md:items-end">
            <div className="flex flex-wrap gap-2">
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-8 w-20" />
              <Skeleton className="h-8 w-28" />
            </div>
            <div className="flex w-full min-w-0 flex-wrap items-end gap-2 rounded-xl border bg-card/70 p-2 md:w-auto">
              <div className="grid gap-1">
                <Skeleton className="h-3 w-12" />
                <Skeleton className="h-8 w-full min-w-[9.5rem] sm:w-[156px]" />
              </div>
              <div className="grid gap-1">
                <Skeleton className="h-3 w-14" />
                <Skeleton className="h-8 w-full min-w-[9.5rem] sm:w-[156px]" />
              </div>
              <Skeleton className="h-8 w-28" />
            </div>
          </div>
        }
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
