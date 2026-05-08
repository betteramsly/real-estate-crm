"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, Menu } from "lucide-react";
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

const NAV_ITEMS: { href: string; label: string; adminOnly?: boolean }[] = [
  { href: "/dashboard", label: "Дашборд" },
  { href: "/clients", label: "Клиенты" },
  { href: "/properties", label: "Объекты" },
  { href: "/deals", label: "Сделки" },
  { href: "/tasks", label: "Задачи" },
  { href: "/team", label: "Команда", adminOnly: true },
];

export function AppHeader({ profile }: { profile: Profile }) {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = React.useState(false);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  };

  const role: UserRole = profile.role;
  const items = NAV_ITEMS.filter((i) => !i.adminOnly || role === "admin");

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur">
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden"
        onClick={() => setOpen((v) => !v)}
        aria-label="Меню"
      >
        <Menu className="h-4 w-4" />
      </Button>

      <div className="flex flex-1 items-center gap-1 overflow-x-auto md:gap-3">
        {open ? (
          <nav className="absolute left-0 right-0 top-14 flex flex-col gap-1 border-b bg-background p-3 md:hidden">
            {items.map((item) => {
              const active = pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "rounded-md px-3 py-2 text-sm",
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-accent",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>
        ) : null}
      </div>

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
          <DropdownMenuLabel>{profile.full_name ?? "Аккаунт"}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link href="/settings">Профиль</Link>
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={handleSignOut}>
            <LogOut className="mr-2 h-4 w-4" />
            Выйти
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
