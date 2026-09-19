"use client";

import { useState } from "react";
import { ChevronDown, Pencil } from "lucide-react";
import { cn } from "@/lib/utils";

export function PropertyEditPanel({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <section className="overflow-hidden rounded-2xl border border-dashed border-border/80 bg-muted/20">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between gap-3 px-5 py-4 text-left transition-colors hover:bg-muted/30"
        aria-expanded={open}
      >
        <div className="flex min-w-0 items-start gap-3">
          <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border/70 bg-background">
            <Pencil className="h-3.5 w-3.5 text-muted-foreground" aria-hidden />
          </span>
          <div className="min-w-0">
            <h2 className="text-base font-semibold tracking-tight">
              Редактировать карточку
            </h2>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Фото, описание, условия, документы и служебные поля
            </p>
          </div>
        </div>
        <ChevronDown
          className={cn(
            "h-5 w-5 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
        />
      </button>
      <div className={cn("border-t border-border/60 px-4 py-5 md:px-5", !open && "hidden")}>
        {children}
      </div>
    </section>
  );
}
