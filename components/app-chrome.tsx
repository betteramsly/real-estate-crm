"use client";

import { useEffect, useState } from "react";
import { AppHeader } from "@/components/app-header";
import { AppSidebar } from "@/components/app-sidebar";
import { PresentationBasketProvider } from "@/components/catalog/presentation-basket";
import { PageEnter } from "@/components/page-enter";
import { HoverPrefetch } from "@/components/prefetch-link";
import type { Profile, UserRole } from "@/lib/types";

const STORAGE_KEY = "crm-sidebar-open";

export function AppChrome({
  role,
  profile,
  presentMode,
  children,
}: {
  role: UserRole;
  profile: Profile;
  presentMode: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(true);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (window.localStorage.getItem(STORAGE_KEY) === "0") {
      setOpen(false);
    }
    const frame = window.requestAnimationFrame(() => setReady(true));
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const toggle = () => {
    setOpen((current) => {
      const next = !current;
      window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      return next;
    });
  };

  return (
    <PresentationBasketProvider>
      <div className="brand-mesh flex min-h-screen overflow-x-hidden bg-background">
        <HoverPrefetch />
        {presentMode ? null : (
          <AppSidebar
            role={role}
            onClose={toggle}
            collapsed={!open}
            animate={ready}
          />
        )}
        <div className="flex min-w-0 flex-1 flex-col">
          <AppHeader
            profile={profile}
            presentMode={presentMode}
            sidebarOpen={open}
            onToggleSidebar={toggle}
          />
          <main className="min-w-0 flex-1 overflow-x-hidden px-4 py-6 md:px-8">
            <div className="mx-auto w-full min-w-0 max-w-7xl">
              <PageEnter>{children}</PageEnter>
            </div>
          </main>
        </div>
      </div>
    </PresentationBasketProvider>
  );
}
