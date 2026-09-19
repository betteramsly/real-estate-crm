"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
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
  teamOpenCount = 0,
  children,
}: {
  role: UserRole;
  profile: Profile;
  presentMode: boolean;
  teamOpenCount?: number;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(true);
  const [ready, setReady] = useState(false);
  const pathname = usePathname();
  const mainRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (window.localStorage.getItem(STORAGE_KEY) === "0") {
      setOpen(false);
    }
    const frame = window.requestAnimationFrame(() => setReady(true));
    window.history.scrollRestoration = "manual";
    window.scrollTo(0, 0);
    const nodes = [document.documentElement, document.body];
    nodes.forEach((node) => {
      node.classList.add("h-dvh", "overflow-hidden");
    });
    return () => {
      window.cancelAnimationFrame(frame);
      nodes.forEach((node) => {
        node.classList.remove("h-dvh", "overflow-hidden");
      });
    };
  }, []);

  useEffect(() => {
    window.history.scrollRestoration = "manual";
    window.scrollTo(0, 0);
    mainRef.current?.scrollTo({ top: 0 });
  }, [pathname]);

  const toggle = () => {
    setOpen((current) => {
      const next = !current;
      window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      return next;
    });
  };

  return (
    <PresentationBasketProvider>
      <div className="brand-mesh fixed inset-0 flex overflow-hidden bg-background">
        <HoverPrefetch />
        {presentMode ? null : (
          <AppSidebar
            role={role}
            onClose={toggle}
            collapsed={!open}
            animate={ready}
            teamOpenCount={teamOpenCount}
          />
        )}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <AppHeader
            profile={profile}
            presentMode={presentMode}
            sidebarOpen={open}
            onToggleSidebar={toggle}
            teamOpenCount={teamOpenCount}
          />
          <main
            ref={mainRef}
            className="min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-none px-4 pb-6 md:px-8"
          >
            <div className="mx-auto w-full min-w-0 max-w-7xl pt-6">
              <PageEnter>{children}</PageEnter>
            </div>
          </main>
        </div>
      </div>
    </PresentationBasketProvider>
  );
}
