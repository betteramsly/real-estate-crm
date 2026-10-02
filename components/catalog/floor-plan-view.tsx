"use client";

import * as React from "react";
import { ImageIcon, ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export function FloorPlanView({
  src,
  alt,
  className,
  imageClassName,
}: {
  src: string;
  alt: string;
  className?: string;
  imageClassName?: string;
}) {
  const [zoom, setZoom] = React.useState(false);

  return (
    <Dialog
      onOpenChange={(open) => {
        if (!open) setZoom(false);
      }}
    >
      <DialogTrigger asChild>
        <button
          type="button"
          className={cn(
            "group relative block overflow-hidden bg-muted/40 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            className,
          )}
          aria-label={`Открыть планировку: ${alt}`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={alt}
            className={cn(
              "absolute inset-0 h-full w-full object-contain",
              imageClassName,
            )}
          />
          <span className="pointer-events-none absolute bottom-2 right-2 inline-flex items-center gap-1 rounded-full bg-russian/80 px-2 py-1 text-[11px] font-medium text-white opacity-100 sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100 sm:group-focus-visible:opacity-100">
            <ZoomIn className="h-3.5 w-3.5" />
            Увеличить
          </span>
        </button>
      </DialogTrigger>
      <DialogContent className="max-h-[94vh] w-[min(96vw,68rem)] max-w-none gap-3 overflow-hidden p-3 sm:rounded-3xl">
        <div className="flex items-center justify-between gap-3 pr-8">
          <DialogTitle className="font-display text-base font-semibold tracking-tight">
            Планировка
          </DialogTitle>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setZoom((current) => !current)}
          >
            {zoom ? <ZoomOut className="h-4 w-4" /> : <ZoomIn className="h-4 w-4" />}
            {zoom ? "Вместить" : "Увеличить"}
          </Button>
        </div>
        <div
          className={cn(
            "max-h-[calc(94vh-4.75rem)] overflow-auto rounded-2xl bg-muted/30",
            zoom ? "cursor-zoom-out" : "cursor-zoom-in",
          )}
          onClick={() => setZoom((current) => !current)}
        >
          {/* Floor plans are realtor screenshots already stored as webp. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={src}
            alt={alt}
            className={cn(
              "mx-auto block h-auto object-contain",
              zoom
                ? "w-[200%] max-w-none"
                : "max-h-[calc(94vh-4.75rem)] w-full",
            )}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function FloorPlanEmpty({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "flex min-h-40 items-center justify-center gap-2 bg-muted/30 px-4 text-sm text-muted-foreground",
        className,
      )}
    >
      <ImageIcon className="h-4 w-4" />
      Планировка не приложена
    </div>
  );
}
