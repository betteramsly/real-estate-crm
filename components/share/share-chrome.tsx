import { BrandLockup } from "@/components/brand-mark";
import { formatDate } from "@/lib/formatters";

export function ShareChrome({ expiresAt }: { expiresAt?: string | null }) {
  return (
    <header className="sticky top-0 z-40 flex h-14 items-center justify-between gap-3 border-b bg-background/80 px-4 backdrop-blur">
      <BrandLockup line className="h-5 max-w-[240px]" />
      {expiresAt ? (
        <p className="text-xs text-muted-foreground">до {formatDate(expiresAt)}</p>
      ) : null}
    </header>
  );
}