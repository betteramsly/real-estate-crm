"use client";

import * as React from "react";
import { PrefetchLink } from "@/components/prefetch-link";
import { LogOut, Menu, PanelLeft } from "lucide-react";
import { BrandLockup, BrandMark } from "@/components/brand-mark";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { initials } from "@/lib/formatters";
import type { Profile, UserRole } from "@/lib/types";
import { usePathname } from "next/navigation";
import { PresentModeToggle } from "@/components/catalog/present-mode-toggle";
import { ShareClientButton } from "@/components/catalog/share-client-sheet";
import { BrandLoaderOverlay } from "@/components/brand-loader";

const NAV_ITEMS: { href: string; label: string; adminOnly?: boolean; accent?: boolean }[] = [
  { href: "/dashboard", label: "Дашборд" },
  { href: "/clients", label: "Клиенты" },
  { href: "/deals", label: "Сделки" },
  { href: "/tasks", label: "Задачи" },
  { href: "/team", label: "Команда", adminOnly: true },
  { href: "/properties", label: "База ЖК", accent: true },
];

export function AppHeader({
  profile,
  presentMode = false,
  sidebarOpen = true,
  onToggleSidebar,
}: {
  profile: Profile;
  presentMode?: boolean;
  sidebarOpen?: boolean;
  onToggleSidebar?: () => void;
}) {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);
  const [leaving, setLeaving] = React.useState(false);
  const onCatalog = pathname.startsWith("/properties");

  const handleSignOut = async () => {
    if (leaving) return;
    setLeaving(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.assign("/login");
  };

  const role: UserRole = profile.role;
  const items = NAV_ITEMS.filter((i) => !i.adminOnly || role === "admin");

  return (
    <>
      {leaving ? <BrandLoaderOverlay label="Выходим" /> : null}
      <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur">
      {presentMode ? null : (
        <>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label="Меню"
          >
            <Menu className="h-4 w-4" />
          </Button>
          {sidebarOpen ? null : (
            <Button
              variant="ghost"
              size="icon"
              className="hidden md:inline-flex"
              onClick={onToggleSidebar}
              aria-label="Открыть панель"
            >
              <PanelLeft className="h-4 w-4" />
            </Button>
          )}
        </>
      )}

      <div className="flex flex-1 items-center gap-1 overflow-x-auto md:gap-3">
        {presentMode ? (
          <BrandLockup line className="h-5 max-w-[240px]" />
        ) : (
          <BrandMark className={cn("h-7", sidebarOpen && "md:hidden")} />
        )}
        {open && !presentMode ? (
          <nav className="absolute left-0 right-0 top-14 flex flex-col gap-1 border-b bg-background p-3 md:hidden">
            {items.map((item) => {
              const active = pathname.startsWith(item.href);
              return (
                <PrefetchLink
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "rounded-md px-3 py-2 text-sm",
                    item.accent && "font-semibold",
                    active
                      ? item.accent
                        ? "bg-primary text-primary-foreground"
                        : "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-accent",
                  )}
                >
                  {item.label}
                </PrefetchLink>
              );
            })}
          </nav>
        ) : null}
      </div>

      {presentMode || onCatalog ? (
        <div className="flex items-center gap-2">
          <ShareClientButton compact />
          <PresentModeToggle presentMode={presentMode} compact />
        </div>
      ) : null}

      {presentMode ? null : (
        <>
          <ThemeToggle />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="gap-2 px-2">
                <Avatar className="h-7 w-7">
                  {profile.avatar_url ? (
                    <AvatarImage
                      src={profile.avatar_url}
                      alt={profile.full_name ?? "Аватар"}
                    />
                  ) : null}
                  <AvatarFallback>{initials(profile.full_name)}</AvatarFallback>
                </Avatar>
                <div className="hidden text-left md:block">
                  <p className="text-sm font-medium leading-none">
                    {profile.full_name ?? "Без имени"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {role === "admin" ? "Администратор" : "Агент"}
                  </p>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                {profile.full_name ?? "Аккаунт"}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <PrefetchLink href="/settings">Профиль</PrefetchLink>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSignOut} disabled={leaving}>
                <LogOut className="mr-2 h-4 w-4" />
                Выйти
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </>
      )}
      </header>
    </>
  );
}
