"use client";

import { formatCurrency } from "@/lib/formatters";
import { cn } from "@/lib/utils";

interface DealsStageChartProps {
  data: {
    stage: string;
    label: string;
    color: string;
    count: number;
    amount: number;
  }[];
}

export function DealsStageChart({ data }: DealsStageChartProps) {
  const maxCount = Math.max(1, ...data.map((d) => d.count));

  return (
    <div className="space-y-3">
      {data.map((item) => (
        <div key={item.stage} className="space-y-1">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <span className={cn("h-2 w-2 rounded-full", item.color)} />
              <span>{item.label}</span>
            </div>
            <span className="text-xs text-muted-foreground">
              {item.count} · {formatCurrency(item.amount)}
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={cn("h-full rounded-full", item.color)}
              style={{ width: `${(item.count / maxCount) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
