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

      <section className="overflow-hidden rounded-3xl border bg-card shadow-sm">
        <div className="relative aspect-[16/10] w-full bg-muted md:aspect-[16/9]">
          <Skeleton className="absolute inset-0 rounded-none" />
          <Skeleton className="absolute left-3 top-3 z-10 h-8 w-28 rounded-full bg-black/40" />
          <Skeleton className="absolute right-3 top-3 z-10 h-6 w-[4.5rem] rounded-full bg-black/40" />
          <div className="absolute inset-x-0 bottom-0 z-10 bg-gradient-to-t from-black via-black/75 to-transparent px-4 pb-4 pt-24 md:px-6 md:pb-5">
            <Skeleton className="h-3 w-28 bg-white/35" />
            <Skeleton className="mt-2 h-8 w-[78%] max-w-md bg-white/45 md:h-10" />
            <div className="mt-3 flex flex-wrap gap-1.5">
              <Skeleton className="h-6 w-24 rounded-full bg-background/85" />
              <Skeleton className="h-6 w-20 rounded-full bg-background/85" />
            </div>
            <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
              <Skeleton className="h-4 w-36 max-w-full bg-white/35" />
              <Skeleton className="h-4 w-24 bg-white/35" />
              <Skeleton className="h-4 w-32 bg-white/35" />
            </div>
          </div>
        </div>
        <div className="flex gap-2 overflow-x-auto p-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton
              key={index}
              className="h-16 w-24 shrink-0 rounded-xl"
            />
          ))}
        </div>
      </section>

      <div className="space-y-7">
        <div className="space-y-2.5">
          <Skeleton className="h-3 w-28" />
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-9 w-24 rounded-md" />
            <Skeleton className="h-9 w-36 rounded-md" />
            <Skeleton className="h-9 w-32 rounded-md" />
          </div>
        </div>

        <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(16rem,22rem)] lg:gap-8">
          <section className="min-w-0 space-y-4">
            <div className="flex items-center justify-between gap-3">
              <Skeleton className="h-7 w-40" />
              <Skeleton className="h-4 w-4 rounded-full md:hidden" />
            </div>
            <div className="flex flex-wrap gap-2">
              <div className="min-w-[7.5rem] space-y-2 rounded-xl border border-border/60 bg-muted/30 px-3.5 py-2.5">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-4 w-20" />
              </div>
              <div className="min-w-[7.5rem] space-y-2 rounded-xl border border-border/60 bg-muted/30 px-3.5 py-2.5">
                <Skeleton className="h-3 w-14" />
                <Skeleton className="h-4 w-16" />
              </div>
              <div className="min-w-[7.5rem] space-y-2 rounded-xl border border-border/60 bg-muted/30 px-3.5 py-2.5">
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-4 w-24" />
              </div>
              <div className="min-w-[7.5rem] space-y-2 rounded-xl border border-border/60 bg-muted/30 px-3.5 py-2.5">
                <Skeleton className="h-3 w-12" />
                <Skeleton className="h-4 w-14" />
              </div>
            </div>
            <div className="space-y-3 border-t border-border/50 pt-5">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-[92%]" />
              <Skeleton className="h-4 w-4/5" />
            </div>
          </section>

          <div className="space-y-4 rounded-2xl border border-border/70 bg-card/60 p-4 md:p-5">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-5 w-4/5 max-w-xs" />
            <Skeleton className="h-9 w-full" />
            <Skeleton className="min-h-40 w-full rounded-xl" />
          </div>
        </div>

        <div className="h-px bg-border/60" />

        <div className="grid items-stretch gap-5 lg:grid-cols-2">
          <TermSkeleton />
          <TermSkeleton wide />
        </div>

        <div className="h-px bg-border/60" />

        <section className="space-y-4">
          <div className="space-y-1">
            <Skeleton className="h-7 w-16" />
            <Skeleton className="h-4 w-64 max-w-full" />
          </div>
          <div className="flex justify-center rounded-2xl border border-border/60 bg-card/40 p-3 md:p-5">
            <Skeleton className="h-64 w-full max-w-md rounded-xl" />
          </div>
        </section>

        <div className="h-px bg-border/60" />

        <section className="overflow-hidden rounded-2xl border border-border/70 bg-card/80">
          <div className="border-b border-border/60 px-5 py-3.5 md:px-6">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="mt-2 h-3 w-56 max-w-full" />
          </div>
          <div className="grid gap-3 px-5 py-5 sm:grid-cols-2 md:px-6">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="space-y-2 rounded-xl border border-border/60 bg-muted/40 px-4 py-3"
              >
                <Skeleton className="h-3 w-24" />
                <Skeleton className="h-4 w-full" />
              </div>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}

function TermSkeleton({ wide = false }: { wide?: boolean }) {
  return (
    <section className="flex min-w-0 flex-col gap-2.5">
      <div className="space-y-1">
        {wide ? (
          <Skeleton className="h-7 w-32" />
        ) : (
          <Skeleton className="h-7 w-28" />
        )}
        <Skeleton className="h-4 w-56 max-w-full" />
      </div>
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="flex items-center justify-between gap-3 border-b border-border/60 px-3 py-2 last:border-b-0"
          >
            <Skeleton className="h-4 w-2/5" />
            <Skeleton className="h-4 w-16" />
          </div>
        ))}
      </div>
    </section>
  );
}
