"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

export function PropertyEditPanel({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <section className="overflow-hidden rounded-2xl border bg-card">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center justify-between gap-3 px-5 py-3.5 text-left"
        aria-expanded={open}
      >
        <h2 className="text-base font-semibold tracking-tight">Редактировать</h2>
        <ChevronDown
          className={cn(
            "h-5 w-5 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
        />
      </button>
      <div className={cn("border-t px-4 py-5 md:px-5", !open && "hidden")}>
        {children}
      </div>
    </section>
  );
}
