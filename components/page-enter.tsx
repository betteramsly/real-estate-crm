"use client";

import { usePathname } from "next/navigation";

export function PageEnter({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div key={pathname} className="page-enter space-y-6">
      {children}
    </div>
  );
}
