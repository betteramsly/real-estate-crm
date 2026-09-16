import { cn } from "@/lib/utils";

function ThemedLogo({
  lightSrc,
  darkSrc,
  alt,
  className,
  objectCenter = false,
}: {
  lightSrc: string;
  darkSrc: string;
  alt: string;
  className?: string;
  objectCenter?: boolean;
}) {
  const fit = cn(
    "h-full w-auto max-w-full object-contain",
    objectCenter ? "object-center" : "object-left",
  );

  return (
    <span
      className={cn(
        "inline-flex items-center",
        objectCenter && "justify-center",
        className,
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={darkSrc} alt="" className={cn(fit, "dark:hidden")} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={lightSrc} alt={alt} className={cn(fit, "hidden dark:block")} />
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
  vertical = false,
}: {
  className?: string;
  compact?: boolean;
  line?: boolean;
  vertical?: boolean;
}) {
  const lightSrc = vertical
    ? "/brand/lockup-vertical-light.png"
    : line
      ? "/brand/lockup-line-light.png"
      : "/brand/lockup-stack-light.png";
  const darkSrc = vertical
    ? "/brand/lockup-vertical-dark.png"
    : line
      ? "/brand/lockup-line-dark.png"
      : "/brand/lockup-stack-dark.png";

  return (
    <ThemedLogo
      lightSrc={lightSrc}
      darkSrc={darkSrc}
      alt="MANTAEV CAPITAL"
      objectCenter={vertical}
      className={cn(
        vertical ? "h-28" : line ? "h-5" : compact ? "h-8" : "h-12",
        className,
      )}
    />
  );
}
