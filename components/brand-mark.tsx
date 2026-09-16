import { cn } from "@/lib/utils";

function ThemedLogo({
  lightSrc,
  darkSrc,
  alt,
  className,
}: {
  lightSrc: string;
  darkSrc: string;
  alt: string;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={darkSrc}
        alt=""
        className="h-full w-auto max-w-full object-contain object-left dark:hidden"
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={lightSrc}
        alt={alt}
        className="hidden h-full w-auto max-w-full object-contain object-left dark:block"
      />
    </span>
  );
}

export function BrandMark({ className }: { className?: string }) {
  return (
    <ThemedLogo
      lightSrc="/brand/mark-light.png"
      darkSrc="/brand/mark-dark.png"
      alt=""
      className={cn("h-7", className)}
    />
  );
}

export function BrandLockup({
  className,
  compact = false,
  line = false,
}: {
  className?: string;
  compact?: boolean;
  line?: boolean;
}) {
  return (
    <ThemedLogo
      lightSrc={
        line ? "/brand/lockup-line-light.png" : "/brand/lockup-stack-light.png"
      }
      darkSrc={
        line ? "/brand/lockup-line-dark.png" : "/brand/lockup-stack-dark.png"
      }
      alt="MANTAEV CAPITAL"
      className={cn(line ? "h-5" : compact ? "h-8" : "h-12", className)}
    />
  );
}
