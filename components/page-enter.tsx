"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function PageEnter({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [animate, setAnimate] = useState(true);

  useEffect(() => {
    setAnimate(true);
    const timer = window.setTimeout(() => setAnimate(false), 400);
    return () => window.clearTimeout(timer);
  }, [pathname]);

  return (
    <div key={pathname} className={cn("space-y-6", animate && "page-enter")}>
      {children}
    </div>
  );
}
