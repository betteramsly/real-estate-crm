"use client";

import { useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { setPresentModeAction } from "@/lib/actions/present-mode";
import { cn } from "@/lib/utils";

export function PresentModeToggle({
  presentMode,
  compact = false,
}: {
  presentMode: boolean;
  compact?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const pathname = usePathname();
  const router = useRouter();

  const toggle = () => {
    const next = !presentMode;
    startTransition(async () => {
      await setPresentModeAction(next);
      router.refresh();
      if (next && (!pathname.startsWith("/properties") || pathname.startsWith("/properties/new"))) {
        router.push("/properties");
      }
    });
  };

  return (
    <Button
      type="button"
      variant={presentMode ? "default" : "outline"}
      size={compact ? "sm" : "default"}
      onClick={toggle}
      disabled={pending}
      className={cn(presentMode && "shadow-sm")}
    >
      {presentMode ? (
        <EyeOff className="h-4 w-4" />
      ) : (
        <Eye className="h-4 w-4" />
      )}
      {presentMode ? "Закрыть показ" : "Режим показа"}
    </Button>
  );
}
