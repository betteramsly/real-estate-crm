"use client";

import * as React from "react";
import Link, { type LinkProps } from "next/link";
import { useRouter } from "next/navigation";

type PrefetchLinkProps = LinkProps &
  Omit<React.AnchorHTMLAttributes<HTMLAnchorElement>, keyof LinkProps> & {
    children?: React.ReactNode;
  };

export const PrefetchLink = React.forwardRef<
  HTMLAnchorElement,
  PrefetchLinkProps
>(({ href, onMouseEnter, onFocus, onTouchStart, ...props }, ref) => {
  const router = useRouter();
  const prefetchedRef = React.useRef(false);

  const triggerPrefetch = React.useCallback(() => {
    if (prefetchedRef.current) return;
    prefetchedRef.current = true;
    if (typeof href === "string") {
      router.prefetch(href);
    }
  }, [href, router]);

  return (
    <Link
      ref={ref}
      href={href}
      onMouseEnter={(event) => {
        triggerPrefetch();
        onMouseEnter?.(event);
      }}
      onFocus={(event) => {
        triggerPrefetch();
        onFocus?.(event);
      }}
      onTouchStart={(event) => {
        triggerPrefetch();
        onTouchStart?.(event);
      }}
      {...props}
    />
  );
});

PrefetchLink.displayName = "PrefetchLink";
