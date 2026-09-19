import { Breadcrumbs } from "@/components/breadcrumbs";
import { Skeleton } from "@/components/ui/skeleton";

export default function PropertyDetailLoading() {
  return (
    <>
      <Breadcrumbs
        items={[
          { label: "База ЖК", href: "/properties" },
          { label: "Загрузка..." },
        ]}
      />

      <div className="overflow-hidden rounded-3xl border bg-card">
        <Skeleton className="aspect-[16/10] w-full rounded-none md:aspect-[16/9]" />
        <div className="flex gap-2 p-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-16 w-24 shrink-0 rounded-xl" />
          ))}
        </div>
      </div>

      <Skeleton className="h-16 w-full rounded-2xl" />

      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 4 }).map((_, index) => (
          <Skeleton key={index} className="h-9 w-28 rounded-full" />
        ))}
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(16rem,22rem)]">
        <Skeleton className="h-56 w-full rounded-2xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-2">
        <Skeleton className="h-48 rounded-2xl" />
        <Skeleton className="h-48 rounded-2xl" />
      </div>

      <Skeleton className="h-72 w-full rounded-2xl" />
      <Skeleton className="h-36 w-full rounded-2xl" />
    </>
  );
}
