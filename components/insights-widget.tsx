import { AlertTriangle, ArrowRight, Info, Sparkles } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PrefetchLink } from "@/components/prefetch-link";
import type { InsightItem } from "@/lib/insights";
import { cn } from "@/lib/utils";

interface InsightsWidgetProps {
  insights: InsightItem[];
}

const SEVERITY_STYLES: Record<
  InsightItem["severity"],
  { color: string; icon: React.ComponentType<{ className?: string }> }
> = {
  warning: {
    color: "bg-amber-500/15 text-amber-500",
    icon: AlertTriangle,
  },
  info: {
    color: "bg-sky-500/15 text-sky-500",
    icon: Info,
  },
};

export function InsightsWidget({ insights }: InsightsWidgetProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          Требует внимания
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {insights.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Всё под контролем — нет горячих задач или сделок без движения.
          </p>
        ) : (
          insights.map((insight) => {
            const meta = SEVERITY_STYLES[insight.severity];
            const Icon = meta.icon;
            return (
              <PrefetchLink
                key={insight.id}
                href={insight.href}
                className="group flex items-start gap-3 rounded-lg border border-transparent p-3 transition-colors hover:border-border hover:bg-accent/50"
              >
                <span
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-md",
                    meta.color,
                  )}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <div className="min-w-0 flex-1 space-y-1">
                  <p className="text-sm font-medium">{insight.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {insight.description}
                  </p>
                </div>
                <ArrowRight className="mt-2 h-4 w-4 shrink-0 opacity-0 transition-opacity group-hover:opacity-100" />
              </PrefetchLink>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
