import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { TasksFilters } from "./tasks-filters";

export default function TasksLoading() {
  return (
    <>
      <PageHeader
        title="Задачи"
        description="Список задач с дедлайнами и приоритетами"
        actions={<Button disabled>Новая задача</Button>}
      />

      <TasksFilters />

      <div className="space-y-2">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="flex items-start gap-3 rounded-xl border bg-card p-4"
          >
            <Skeleton className="mt-1 h-5 w-5 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-2/3" />
              <div className="flex flex-wrap items-center gap-2">
                <Skeleton className="h-5 w-20" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-40" />
              </div>
            </div>
            <Skeleton className="h-8 w-8 rounded-md" />
          </div>
        ))}
      </div>
    </>
  );
}
