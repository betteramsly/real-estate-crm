import Link from "next/link";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DEAL_STAGE_COLORS,
  DEAL_STAGE_LABELS,
  DEAL_STAGE_ORDER,
} from "@/lib/constants";
import { cn } from "@/lib/utils";

export default function DealsLoading() {
  return (
    <>
      <PageHeader
        title="Сделки"
        description="Канбан-воронка: перетаскивайте сделки между этапами"
        actions={
          <Button asChild>
            <Link href="/deals/new">
              <Plus className="h-4 w-4" />
              Новая сделка
            </Link>
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-6">
        {DEAL_STAGE_ORDER.map((stage, columnIndex) => (
          <div
            key={stage}
            className="flex h-full min-h-[400px] flex-col rounded-xl border bg-card/40 p-3"
          >
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "h-2 w-2 rounded-full",
                    DEAL_STAGE_COLORS[stage],
                  )}
                />
                <h3 className="text-sm font-semibold">
                  {DEAL_STAGE_LABELS[stage]}
                </h3>
                <Badge variant="secondary" className="text-xs">
                  …
                </Badge>
              </div>
            </div>
            <Skeleton className="mb-3 h-4 w-28" />
            <div className="flex flex-1 flex-col gap-2">
              {Array.from({ length: columnIndex % 2 === 0 ? 3 : 2 }).map(
                (_, cardIndex) => (
                  <div
                    key={cardIndex}
                    className="rounded-xl border bg-card p-3"
                  >
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
    </>
  );
}
