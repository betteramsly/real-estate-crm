"use client";

import * as React from "react";
import { recordShareEventAction } from "@/lib/actions/catalog-share";
import type { ShareEventType } from "@/lib/catalog-share";

export function ShareTracker({
  token,
  event,
  propertyId,
}: {
  token: string;
  event: ShareEventType;
  propertyId?: string;
}) {
  React.useEffect(() => {
    void recordShareEventAction({ token, event, propertyId });
  }, [token, event, propertyId]);

  return null;
}
