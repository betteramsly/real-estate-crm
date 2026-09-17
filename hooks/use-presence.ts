"use client";

import * as React from "react";

/** Keep a node mounted through its exit animation. */
export function usePresence(open: boolean, duration = 220) {
  const [mounted, setMounted] = React.useState(open);
  const [visible, setVisible] = React.useState(open);

  React.useEffect(() => {
    if (open) {
      setMounted(true);
      const id = window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => setVisible(true));
      });
      return () => window.cancelAnimationFrame(id);
    }

    setVisible(false);
    const timeout = window.setTimeout(() => setMounted(false), duration);
    return () => window.clearTimeout(timeout);
  }, [open, duration]);

  return { mounted, visible };
}
