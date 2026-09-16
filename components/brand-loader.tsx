import { BrandMark } from "@/components/brand-mark";
import { cn } from "@/lib/utils";

export function BrandLoader({
  label = "Загрузка",
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn("flex flex-col items-center gap-5", className)}
    >
      <BrandMark className="h-11" />
      <div
        aria-hidden
        className="relative h-px w-36 overflow-hidden bg-grey/30"
      >
        <span className="absolute inset-y-0 w-1/2 animate-brand-sweep bg-gold motion-reduce:animate-none" />
      </div>
      <p className="text-[11px] font-medium uppercase tracking-[0.22em] text-muted-foreground">
        {label}
      </p>
    </div>
  );
}

export function BrandLoaderScreen({
  label,
  className,
}: {
  label?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-h-screen items-center justify-center",
        className,
      )}
    >
      <BrandLoader label={label} />
    </div>
  );
}

export function BrandLoaderOverlay({ label }: { label?: string }) {
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-background/85 backdrop-blur-[2px]">
      <div className="brand-mesh absolute inset-0 opacity-70" />
      <BrandLoader className="relative" label={label} />
    </div>
  );
}
