"use client";

import * as React from "react";
import { Download, ImageIcon, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function planFilename(src: string) {
  try {
    const path = new URL(src, window.location.origin).pathname;
    const base = decodeURIComponent(path.split("/").pop() ?? "");
    if (/\.(webp|jpe?g|png)$/i.test(base)) return base;
  } catch {
    // Blob previews and odd URLs fall through to a stable name.
  }
  return "планировка.webp";
}

async function downloadFloorPlan(src: string) {
  const filename = planFilename(src);
  try {
    const response = await fetch(src);
    if (!response.ok) throw new Error("download failed");
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  } catch {
    window.open(src, "_blank", "noopener,noreferrer");
  }
}

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
  const [pending, setPending] = React.useState(false);

  return (
    <div
      className={cn(
        "relative overflow-hidden bg-muted/40",
        className,
      )}
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
      <Button
        type="button"
        size="sm"
        variant="secondary"
        className="absolute bottom-2 right-2 bg-russian/80 text-white hover:bg-russian"
        disabled={pending}
        aria-label={`Скачать планировку: ${alt}`}
        onClick={() => {
          setPending(true);
          void downloadFloorPlan(src).finally(() => setPending(false));
        }}
      >
        {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Download className="h-3.5 w-3.5" />}
        Скачать
      </Button>
    </div>
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
