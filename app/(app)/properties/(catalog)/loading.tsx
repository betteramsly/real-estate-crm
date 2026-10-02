import { CardsGridSkeleton } from "@/components/loading-skeletons";
import { Skeleton } from "@/components/ui/skeleton";

export default function PropertiesLoading() {
  return (
    <>
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div className="space-y-1">
          <Skeleton className="h-3 w-36" />
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-4 w-28" />
        </div>
        <Skeleton className="h-9 w-44" />
      </div>

      <div className="sticky top-0 z-30 -mx-4 border-b bg-background/95 px-4 py-3 backdrop-blur md:-mx-8 md:px-8">
        <div className="flex h-11 min-w-0 items-center rounded-full border bg-background/80 pr-1 shadow-sm">
          <div className="flex min-w-0 flex-1 items-center px-3">
            <Skeleton className="h-4 w-44 max-w-[70%]" />
          </div>
          <Skeleton className="h-9 w-[6.75rem] shrink-0 rounded-full md:w-[7.5rem]" />
        </div>
      </div>

      <CardsGridSkeleton
        cards={6}
        columns="md:grid-cols-2 min-[965px]:grid-cols-3"
      />
    </>
  );
}
