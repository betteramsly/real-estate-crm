import * as React from "react";
import { ChevronRight } from "lucide-react";
import { PrefetchLink } from "@/components/prefetch-link";
import { cn } from "@/lib/utils";

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function Breadcrumbs({ items, className }: BreadcrumbsProps) {
  return (
    <nav
      aria-label="Хлебные крошки"
      className={cn(
        "flex flex-wrap items-center gap-1 text-sm text-muted-foreground",
        className,
      )}
    >
      {items.map((item, index) => {
        const isLast = index === items.length - 1;
        return (
          <React.Fragment key={`${item.label}-${index}`}>
            {item.href && !isLast ? (
              <PrefetchLink
                href={item.href}
                className="rounded-md px-1 transition-colors hover:bg-accent hover:text-foreground"
              >
                {item.label}
              </PrefetchLink>
            ) : (
              <span
                className={cn(
                  "px-1",
                  isLast && "max-w-[18rem] truncate font-medium text-foreground",
                )}
              >
                {item.label}
              </span>
            )}
            {!isLast ? (
              <ChevronRight className="h-3.5 w-3.5 shrink-0 opacity-60" />
            ) : null}
          </React.Fragment>
        );
      })}
    </nav>
  );
}
