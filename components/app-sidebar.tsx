"use client";

import * as React from "react";
import { PrefetchLink } from "@/components/prefetch-link";
import { usePathname } from "next/navigation";
import {
  Building2,
  CheckSquare,
  Handshake,
  LayoutDashboard,
  Users,
  UserCog,
  Loader2,
  PanelLeftClose,
} from "lucide-react";
import { BrandLockup } from "@/components/brand-mark";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { UserRole } from "@/lib/types";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  adminOnly?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Дашборд", icon: LayoutDashboard },
  { href: "/clients", label: "Клиенты", icon: Users },
  { href: "/deals", label: "Сделки", icon: Handshake },
  { href: "/tasks", label: "Задачи", icon: CheckSquare },
  { href: "/team", label: "Команда", icon: UserCog, adminOnly: true },
];

export function AppSidebar({
  role,
  onClose,
  collapsed = false,
  animate = true,
  teamOpenCount = 0,
}: {
  role: UserRole;
  onClose: () => void;
  collapsed?: boolean;
  animate?: boolean;
  teamOpenCount?: number;
}) {
  const pathname = usePathname();
  const [clickedHref, setClickedHref] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!clickedHref) return;
    const navigationFinished =
      pathname === clickedHref ||
      (clickedHref !== "/dashboard" && pathname.startsWith(clickedHref));
    if (navigationFinished) setClickedHref(null);
  }, [clickedHref, pathname]);

  const items = NAV_ITEMS.filter((item) => !item.adminOnly || role === "admin");
  const catalogActive =
    pathname === "/properties" || pathname.startsWith("/properties/");

  return (
    <aside
      aria-hidden={collapsed}
      className={cn(
        "hidden h-full max-h-dvh shrink-0 overflow-hidden border-r bg-card/60 md:flex md:flex-col",
        animate &&
          "transition-[width,opacity,border-color] duration-300 ease-luxury motion-reduce:transition-none",
        collapsed
          ? "pointer-events-none w-0 border-r-0 opacity-0"
          : "w-60 opacity-100",
      )}
    >
      <div className="flex h-full w-60 flex-col">
      <div className="flex h-14 items-center justify-between gap-2 border-b px-3">
        <PrefetchLink href="/dashboard" className="min-w-0">
          <BrandLockup compact className="h-9 max-w-[160px]" />
        </PrefetchLink>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={onClose}
          aria-label="Закрыть панель"
        >
          <PanelLeftClose className="h-4 w-4" />
        </Button>
      </div>
      <nav className="min-h-0 flex-1 space-y-1 overflow-y-auto p-3">
        {items.map((item) => {
          const Icon = item.icon;
          const active =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));
          const clicked = clickedHref === item.href;

          return (
            <PrefetchLink
              key={item.href}
              href={item.href}
              onClick={() => {
                if (!active) setClickedHref(item.href);
              }}
              className={cn(
                "flex items-center justify-between gap-3 rounded-md px-3 py-2 text-sm transition-colors duration-200 ease-luxury active:scale-[0.98] motion-reduce:active:scale-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                clicked &&
                  "bg-primary/15 text-primary shadow-sm ring-1 ring-primary/20",
              )}
            >
              <span className="flex items-center gap-3">
                <Icon className="h-4 w-4" />
                {item.label}
              </span>
              {clicked ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : item.href === "/team" && teamOpenCount > 0 ? (
                <span className="inline-flex min-w-5 justify-center rounded-full bg-primary px-1.5 text-[10px] font-semibold leading-5 text-primary-foreground">
                  {teamOpenCount > 99 ? "99+" : teamOpenCount}
                </span>
              ) : null}
            </PrefetchLink>
          );
        })}
      </nav>
      <div className="mt-auto shrink-0 p-3">
        <PrefetchLink
          href="/properties"
          onClick={() => {
            if (!catalogActive) setClickedHref("/properties");
          }}
          className={cn(
            "flex items-center justify-between gap-3 rounded-full px-3 py-3 text-sm font-semibold shadow-sm transition-colors duration-200 ease-luxury",
            catalogActive
              ? "bg-primary text-primary-foreground"
              : "bg-primary/15 text-primary ring-1 ring-primary/25 hover:bg-primary/20",
          )}
        >
          <span className="flex items-center gap-3">
            <Building2 className="h-5 w-5" />
            База ЖК
          </span>
          {clickedHref === "/properties" ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : null}
        </PrefetchLink>
      </div>
      </div>
    </aside>
  );
}
