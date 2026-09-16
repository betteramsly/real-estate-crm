import { Star } from "lucide-react";
import { cn } from "@/lib/utils";

export function RelevanceStars({
  value,
  className,
}: {
  value: 1 | 2 | 3;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full bg-russian px-2 py-0.5 shadow-sm ring-1 ring-white/10",
        className,
      )}
      aria-label={`${value} из 3`}
    >
      {Array.from({ length: value }).map((_, index) => (
        <Star
          key={index}
          className="h-3.5 w-3.5 fill-gold text-gold"
        />
      ))}
    </span>
  );
}
