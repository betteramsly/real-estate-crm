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

      <Skeleton className="h-40 w-full rounded-2xl" />
      <Skeleton className="h-56 w-full rounded-2xl" />
      <div className="grid gap-3 sm:grid-cols-2">
        <Skeleton className="h-12 rounded-2xl" />
        <Skeleton className="h-12 rounded-2xl" />
      </div>
      <div className="grid items-stretch gap-4 md:grid-cols-2">
        <Skeleton className="h-52 rounded-2xl" />
        <Skeleton className="h-52 rounded-2xl" />
      </div>
      <div className="grid items-stretch gap-4 md:grid-cols-2">
        <Skeleton className="h-64 rounded-2xl" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    </>
  );
}
