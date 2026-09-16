"use client";

import * as React from "react";
import Link, { type LinkProps } from "next/link";
import { useRouter } from "next/navigation";

type PrefetchLinkProps = LinkProps &
  Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, keyof LinkProps> & {
    children?: React.ReactNode;
  };

type Router = ReturnType<typeof useRouter>;

const warmed = new Set<string>();
const queued = new Set<string>();
const queue: string[] = [];
let active = 0;
const MAX_INFLIGHT = 2;

export function hrefToPath(href: LinkProps["href"] | string): string | null {
  if (typeof href !== "string") {
    const path = href.pathname ?? "";
    if (!path.startsWith("/")) return null;
    const search =
      typeof href.query === "string"
        ? href.query.startsWith("?")
          ? href.query
          : `?${href.query}`
        : href.query
          ? `?${new URLSearchParams(
              Object.entries(href.query).flatMap(([key, value]) =>
                value == null ? [] : [[key, String(value)]],
              ),
            ).toString()}`
          : "";
    return `${path}${search}`;
  }
  if (!href.startsWith("/") || href.startsWith("//")) return null;
  const path = href.split("#")[0];
  return path || null;
}

function currentPath() {
  return `${window.location.pathname}${window.location.search}`;
}

function pumpQueue() {
  while (active < MAX_INFLIGHT && queue.length) {
    const path = queue.shift();
    if (!path) return;
    active += 1;
    void fetch(path, {
      credentials: "same-origin",
      priority: "low",
      headers: { Purpose: "prefetch" },
    })
      .catch(() => undefined)
      .finally(() => {
        active -= 1;
        pumpQueue();
      });
  }
}

export function prefetchPath(router: Router, href: LinkProps["href"] | string) {
  const path = hrefToPath(href);
  if (!path || path === currentPath()) return;

  if (!warmed.has(path)) {
    warmed.add(path);
    router.prefetch(path);
  }

  // router.prefetch is a no-op in `next dev`, so hover starts a real GET there.
  if (process.env.NODE_ENV !== "development") return;
  if (queued.has(path)) return;
  queued.add(path);
  queue.push(path);
  pumpQueue();
}

export const PrefetchLink = React.forwardRef<
  HTMLAnchorElement,
  PrefetchLinkProps
>(
  (
    {
      href,
      prefetch = true,
      onPointerEnter,
      onFocus,
      onTouchStart,
      onPointerDown,
      ...props
    },
    ref,
  ) => {
    const router = useRouter();

    const triggerPrefetch = React.useCallback(() => {
      prefetchPath(router, href);
    }, [href, router]);

    return (
      <Link
        ref={ref}
        href={href}
        prefetch={prefetch}
        onPointerEnter={(event) => {
          triggerPrefetch();
          onPointerEnter?.(event);
        }}
        onFocus={(event) => {
          triggerPrefetch();
          onFocus?.(event);
        }}
        onTouchStart={(event) => {
          triggerPrefetch();
          onTouchStart?.(event);
        }}
        onPointerDown={(event) => {
          triggerPrefetch();
          onPointerDown?.(event);
        }}
        {...props}
      />
    );
  },
);

PrefetchLink.displayName = "PrefetchLink";

const WARM_ROUTES = [
  "/dashboard",
  "/properties",
  "/properties/new",
  "/clients",
  "/deals",
  "/tasks",
];

function warmVisibleCatalog(router: Router) {
  const links = document.querySelectorAll<HTMLAnchorElement>(
    'a[href^="/properties/"]',
  );
  let count = 0;
  for (const link of links) {
    const path = hrefToPath(link.getAttribute("href") ?? "");
    if (!path || path === "/properties/new") continue;
    prefetchPath(router, path);
    count += 1;
    if (count >= 3) break;
  }
}

export function HoverPrefetch() {
  const router = useRouter();

  React.useEffect(() => {
    const idle =
      window.requestIdleCallback ??
      ((fn: () => void) => window.setTimeout(fn, 250));
    const cancel = window.cancelIdleCallback ?? window.clearTimeout;
    const timers: Array<number> = [];
    const id = idle(() => {
      WARM_ROUTES.forEach((route, index) => {
        timers.push(
          window.setTimeout(() => prefetchPath(router, route), index * 180),
        );
      });
      timers.push(
        window.setTimeout(() => warmVisibleCatalog(router), 700),
      );
    });

    const onHover = (event: Event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      const link = target.closest("a[href]");
      if (!(link instanceof HTMLAnchorElement)) return;
      if (link.target === "_blank" || link.hasAttribute("download")) return;
      prefetchPath(router, link.getAttribute("href") ?? "");
    };

    document.addEventListener("pointerover", onHover, {
      capture: true,
      passive: true,
    });
    document.addEventListener("focusin", onHover, { capture: true });
    document.addEventListener("pointerdown", onHover, {
      capture: true,
      passive: true,
    });
    return () => {
      cancel(id);
      timers.forEach((timer) => window.clearTimeout(timer));
      document.removeEventListener("pointerover", onHover, true);
      document.removeEventListener("focusin", onHover, true);
      document.removeEventListener("pointerdown", onHover, true);
    };
  }, [router]);

  return null;
}
