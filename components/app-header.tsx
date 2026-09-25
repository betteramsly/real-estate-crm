"use client";

import * as React from "react";
import { PrefetchLink } from "@/components/prefetch-link";
import { LogOut, Menu, PanelLeft } from "lucide-react";
import { BrandLockup, BrandMark } from "@/components/brand-mark";
import { ThemeToggle } from "@/components/theme-toggle";
import { Button, buttonVariants } from "@/components/ui/button";
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
import { usePathname, useRouter } from "next/navigation";
import { PresentModeToggle } from "@/components/catalog/present-mode-toggle";
import { ShareClientButton } from "@/components/catalog/share-client-sheet";
import { BrandLoaderOverlay } from "@/components/brand-loader";
import { usePresence } from "@/hooks/use-presence";

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
  teamOpenCount = 0,
}: {
  profile: Profile;
  presentMode?: boolean;
  sidebarOpen?: boolean;
  onToggleSidebar?: () => void;
  teamOpenCount?: number;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [leaving, setLeaving] = React.useState(false);
  const menu = usePresence(open && !presentMode);
  const onCatalog = pathname.startsWith("/properties");

  React.useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const handleSignOut = async () => {
    if (leaving) return;
    setLeaving(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
  };

  const role: UserRole = profile.role;
  const items = NAV_ITEMS.filter((i) => !i.adminOnly || role === "admin");

  return (
    <>
      {leaving ? <BrandLoaderOverlay label="Выходим" /> : null}
      <header className="sticky top-0 z-40 flex h-14 min-w-0 items-center gap-2 border-b bg-background/80 px-4 backdrop-blur md:gap-3">
      {presentMode ? null : (
        <>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label="Меню"
            aria-expanded={open}
          >
            <Menu className="h-4 w-4" />
          </Button>
          <div
            className={cn(
              "hidden overflow-hidden md:block",
              "transition-[width,opacity,margin] duration-300 ease-luxury motion-reduce:transition-none",
              sidebarOpen
                ? "pointer-events-none w-0 opacity-0"
                : "w-9 opacity-100",
            )}
          >
            <Button
              variant="ghost"
              size="icon"
              onClick={onToggleSidebar}
              aria-label="Открыть панель"
              tabIndex={sidebarOpen ? -1 : 0}
            >
              <PanelLeft className="h-4 w-4" />
            </Button>
          </div>
        </>
      )}

      <div className="flex min-w-0 flex-1 items-center gap-1 md:gap-3">
        {presentMode ? (
          <BrandLockup line className="h-5 max-w-[240px]" />
        ) : (
          <PrefetchLink
            href="/dashboard"
            aria-label="На дашборд"
            className={cn(
              "inline-flex min-w-0 items-center transition-opacity duration-300 ease-luxury motion-reduce:transition-none",
              sidebarOpen && "md:pointer-events-none md:hidden md:opacity-0",
            )}
          >
            <BrandMark className="h-7" />
          </PrefetchLink>
        )}
      </div>

      {presentMode || onCatalog ? (
        <div className="flex shrink-0 items-center gap-1.5 md:gap-2">
          <ShareClientButton compact />
          <PresentModeToggle presentMode={presentMode} compact />
        </div>
      ) : null}

      <ThemeToggle />

      {presentMode ? null : (
        <>
          <DropdownMenu>
            <DropdownMenuTrigger
              className={cn(
                buttonVariants({ variant: "ghost" }),
                "gap-2 px-2",
              )}
            >
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
                  {profile.is_owner
                    ? "Владелец"
                    : role === "admin"
                      ? "Администратор"
                      : "Агент"}
                </p>
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                {profile.full_name ?? "Аккаунт"}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => router.push("/settings")}
                onSelect={() => router.push("/settings")}
              >
                Профиль
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
      {menu.mounted ? (
        <div className="fixed inset-x-0 top-14 bottom-0 z-50 md:hidden">
          <button
            type="button"
            className={cn(
              "absolute inset-0 bg-black/40 transition-opacity duration-200 ease-luxury motion-reduce:transition-none",
              menu.visible ? "opacity-100" : "opacity-0",
            )}
            aria-label="Закрыть меню"
            onClick={() => setOpen(false)}
          />
          <nav
            className={cn(
              "relative flex flex-col gap-1 border-b bg-background p-3 shadow-sm",
              "transition-[opacity,transform] duration-200 ease-luxury motion-reduce:transition-none",
              menu.visible
                ? "translate-y-0 opacity-100"
                : "-translate-y-2 opacity-0",
            )}
          >
            {items.map((item) => {
              const active = pathname.startsWith(item.href);
              return (
                <PrefetchLink
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex items-center justify-between gap-3 rounded-md px-3 py-2 text-sm transition-colors duration-200 ease-luxury",
                    item.accent && "font-semibold",
                    active
                      ? item.accent
                        ? "bg-primary text-primary-foreground"
                        : "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-accent",
                  )}
                >
                  {item.label}
                  {item.href === "/team" && teamOpenCount > 0 ? (
                    <span className="inline-flex min-w-5 justify-center rounded-full bg-primary px-1.5 text-[10px] font-semibold leading-5 text-primary-foreground">
                      {teamOpenCount > 99 ? "99+" : teamOpenCount}
                    </span>
                  ) : null}
                </PrefetchLink>
              );
            })}
          </nav>
        </div>
      ) : null}
    </>
  );
}
