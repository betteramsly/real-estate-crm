import { Skeleton } from "@/components/ui/skeleton";

export function PageHeaderSkeleton() {
  return (
    <div className="flex flex-col gap-3 border-b pb-4 md:flex-row md:items-center md:justify-between">
      <div className="space-y-2">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-80 max-w-full" />
      </div>
      <Skeleton className="h-9 w-36" />
    </div>
  );
}

export function FiltersSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-2 md:flex-row md:items-center md:gap-3">
      <Skeleton className="h-9 flex-1" />
      {Array.from({ length: count }).map((_, index) => (
        <Skeleton key={index} className="h-9 w-full md:w-44" />
      ))}
    </div>
  );
}

export function TableSkeleton({
  rows = 7,
  columns = 6,
}: {
  rows?: number;
  columns?: number;
}) {
  return (
    <div className="rounded-xl border bg-card">
      <div className="grid gap-3 border-b p-3" style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}>
        {Array.from({ length: columns }).map((_, index) => (
          <Skeleton key={index} className="h-4" />
        ))}
      </div>
      <div className="divide-y">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div
            key={rowIndex}
            className="grid gap-3 p-3"
            style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
          >
            {Array.from({ length: columns }).map((_, colIndex) => (
              <Skeleton
                key={colIndex}
                className={colIndex === 0 ? "h-9" : "h-5"}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export function CardsGridSkeleton({
  cards = 6,
  columns = "md:grid-cols-2 lg:grid-cols-3",
}: {
  cards?: number;
  columns?: string;
}) {
  return (
    <div className={`grid grid-cols-1 gap-4 ${columns}`}>
      {Array.from({ length: cards }).map((_, index) => (
        <div key={index} className="overflow-hidden rounded-xl border bg-card">
          <Skeleton className="aspect-[16/10] w-full rounded-none" />
          <div className="space-y-3 p-4">
            <div className="flex justify-between gap-3">
              <Skeleton className="h-5 w-36" />
              <Skeleton className="h-5 w-24" />
            </div>
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-4 w-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function KanbanSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-6">
      {Array.from({ length: 6 }).map((_, columnIndex) => (
        <div
          key={columnIndex}
          className="flex min-h-[400px] flex-col rounded-xl border bg-card/40 p-3"
        >
          <div className="mb-3 flex items-center justify-between">
            <Skeleton className="h-5 w-24" />
            <Skeleton className="h-5 w-8" />
          </div>
          <Skeleton className="mb-3 h-4 w-28" />
          <div className="space-y-2">
            {Array.from({ length: columnIndex % 2 === 0 ? 3 : 2 }).map(
              (_, cardIndex) => (
                <div key={cardIndex} className="rounded-xl border bg-card p-3">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="mt-2 h-3 w-24" />
                  <Skeleton className="mt-3 h-4 w-20" />
                </div>
              ),
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <>
      <PageHeaderSkeleton />
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="rounded-xl border bg-card p-6">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="mt-4 h-8 w-32" />
            <Skeleton className="mt-2 h-3 w-24" />
          </div>
        ))}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-xl border bg-card p-6 lg:col-span-2">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="mt-6 h-[260px] w-full" />
        </div>
        <div className="rounded-xl border bg-card p-6">
          <Skeleton className="h-5 w-28" />
          <div className="mt-6 space-y-4">
            {Array.from({ length: 6 }).map((_, index) => (
              <Skeleton key={index} className="h-7 w-full" />
            ))}
          </div>
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <ListCardSkeleton />
        <ListCardSkeleton />
      </div>
    </>
  );
}

export function ListCardSkeleton() {
  return (
    <div className="rounded-xl border bg-card p-6">
      <Skeleton className="h-5 w-40" />
      <div className="mt-5 space-y-2">
        {Array.from({ length: 5 }).map((_, index) => (
          <div key={index} className="rounded-lg border p-3">
            <Skeleton className="h-4 w-44" />
            <Skeleton className="mt-2 h-3 w-32" />
          </div>
        ))}
      </div>
    </div>
  );
}
