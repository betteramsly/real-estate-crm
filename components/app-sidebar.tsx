"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  CheckSquare,
  Handshake,
  LayoutDashboard,
  Users,
  Settings,
  UserCog,
  Home,
  Loader2,
} from "lucide-react";
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
  { href: "/properties", label: "Объекты", icon: Building2 },
  { href: "/deals", label: "Сделки", icon: Handshake },
  { href: "/tasks", label: "Задачи", icon: CheckSquare },
  { href: "/team", label: "Команда", icon: UserCog, adminOnly: true },
  { href: "/settings", label: "Настройки", icon: Settings },
];

export function AppSidebar({ role }: { role: UserRole }) {
  const pathname = usePathname();
  const [clickedHref, setClickedHref] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!clickedHref) return;

    const navigationFinished =
      pathname === clickedHref ||
      (clickedHref !== "/dashboard" && pathname.startsWith(clickedHref));

    if (navigationFinished) {
      setClickedHref(null);
    }
  }, [clickedHref, pathname]);

  const items = NAV_ITEMS.filter((item) => !item.adminOnly || role === "admin");

  return (
    <aside className="hidden border-r bg-card/40 md:flex md:w-60 md:flex-col">
      <div className="flex h-14 items-center gap-2 border-b px-4">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary text-primary-foreground">
          <Home className="h-4 w-4" />
        </div>
        <div className="flex flex-col leading-tight">
          <span className="text-sm font-semibold">Real Estate</span>
          <span className="text-xs text-muted-foreground">CRM</span>
        </div>
      </div>
      <nav className="flex-1 space-y-1 p-3">
        {items.map((item) => {
          const Icon = item.icon;
          const active =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));
          const clicked = clickedHref === item.href;

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => {
                if (!active) {
                  setClickedHref(item.href);
                }
              }}
              className={cn(
                "flex items-center justify-between gap-3 rounded-md px-3 py-2 text-sm transition-all active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                clicked && "bg-primary/15 text-primary shadow-sm ring-1 ring-primary/20",
              )}
            >
              <span className="flex items-center gap-3">
                <Icon className="h-4 w-4" />
                {item.label}
              </span>
              {clicked ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            </Link>
          );
        })}
      </nav>
      <div className="border-t p-3 text-xs text-muted-foreground">
        <p>v0.1 MVP</p>
      </div>
    </aside>
  );
}
