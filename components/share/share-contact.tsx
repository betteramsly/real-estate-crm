"use client";

import { MessageCircle } from "lucide-react";
import { recordShareEventAction } from "@/lib/actions/catalog-share";
import { agentWhatsappUrl, type ShareAgent } from "@/lib/catalog-share";
import { buttonVariants } from "@/components/ui/button";

export function ShareContactDock({
  token,
  agent,
  shareTitle,
  propertyTitle,
  propertyId,
}: {
  token: string;
  agent: ShareAgent;
  shareTitle?: string | null;
  propertyTitle?: string | null;
  propertyId?: string;
}) {
  if (!agent.whatsapp) return null;

  const href = agentWhatsappUrl({
    whatsapp: agent.whatsapp,
    shareTitle,
    propertyTitle,
  });

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
      <div className="pointer-events-auto mx-auto flex max-w-7xl items-center justify-between gap-3 rounded-full border bg-background/85 px-3 py-2 shadow-lg backdrop-blur md:px-4">
        <div className="min-w-0 pl-1">
          <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Агент
          </p>
          <p className="truncate font-display text-sm font-semibold tracking-tight">
            {agent.name}
          </p>
        </div>
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className={buttonVariants()}
          onClick={() => {
            void recordShareEventAction({
              token,
              event: "contact",
              propertyId,
            });
          }}
        >
          <MessageCircle className="h-4 w-4" />
          Написать
        </a>
      </div>
    </div>
  );
}
