"use client";

import * as React from "react";
import Link from "next/link";
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useDroppable,
  useDraggable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { toast } from "sonner";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { moveDealStage } from "@/lib/actions/deals";
import {
  DEAL_STAGE_COLORS,
  DEAL_STAGE_LABELS,
  DEAL_STAGE_ORDER,
} from "@/lib/constants";
import { formatCurrency, formatDate, initials } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import type { Client, Deal, DealStage, Profile, Property } from "@/lib/types";

interface DealsBoardProps {
  initialDeals: Deal[];
  clients: Pick<Client, "id" | "full_name">[];
  properties: Pick<Property, "id" | "title">[];
  profiles: Profile[];
}

export function DealsBoard({
  initialDeals,
  clients,
  properties,
  profiles,
}: DealsBoardProps) {
  const [deals, setDeals] = React.useState(initialDeals);
  const [activeId, setActiveId] = React.useState<string | null>(null);

  React.useEffect(() => {
    setDeals(initialDeals);
  }, [initialDeals]);

  const clientName = React.useCallback(
    (id: string | null) =>
      id ? clients.find((c) => c.id === id)?.full_name ?? null : null,
    [clients],
  );

  const propertyTitle = React.useCallback(
    (id: string | null) =>
      id ? properties.find((p) => p.id === id)?.title ?? null : null,
    [properties],
  );

  const profileById = React.useMemo(
    () => new Map(profiles.map((p) => [p.id, p])),
    [profiles],
  );

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const onDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  };

  const onDragEnd = async (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over) return;

    const dealId = String(active.id);
    const targetStage = String(over.id) as DealStage;

    const current = deals.find((d) => d.id === dealId);
    if (!current || current.stage === targetStage) return;

    const previous = deals;
    setDeals((prev) =>
      prev.map((d) => (d.id === dealId ? { ...d, stage: targetStage } : d)),
    );

    try {
      await moveDealStage(dealId, targetStage);
    } catch (e) {
      toast.error((e as Error).message);
      setDeals(previous);
    }
  };

  const dealsByStage = React.useMemo(() => {
    const map = new Map<DealStage, Deal[]>();
    DEAL_STAGE_ORDER.forEach((stage) => map.set(stage, []));
    deals.forEach((d) => map.get(d.stage)?.push(d));
    return map;
  }, [deals]);

  const stageTotal = (stage: DealStage) =>
    (dealsByStage.get(stage) ?? []).reduce(
      (sum, d) => sum + (d.amount ?? 0),
      0,
    );

  const activeDeal = activeId ? deals.find((d) => d.id === activeId) : null;

  return (
    <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-6">
        {DEAL_STAGE_ORDER.map((stage) => {
          const items = dealsByStage.get(stage) ?? [];
          return (
            <DealColumn
              key={stage}
              stage={stage}
              total={stageTotal(stage)}
              count={items.length}
            >
              {items.map((deal) => (
                <DealCard
                  key={deal.id}
                  deal={deal}
                  clientName={clientName(deal.client_id)}
                  propertyTitle={propertyTitle(deal.property_id)}
                  assignee={
                    deal.assigned_to ? profileById.get(deal.assigned_to) : null
                  }
                />
              ))}
            </DealColumn>
          );
        })}
      </div>

      <DragOverlay>
        {activeDeal ? (
          <DealCard
            deal={activeDeal}
            clientName={clientName(activeDeal.client_id)}
            propertyTitle={propertyTitle(activeDeal.property_id)}
            assignee={
              activeDeal.assigned_to
                ? profileById.get(activeDeal.assigned_to)
                : null
            }
            isOverlay
          />
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

function DealColumn({
  stage,
  total,
  count,
  children,
}: {
  stage: DealStage;
  total: number;
  count: number;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: stage });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex h-full min-h-[400px] flex-col rounded-xl border bg-card/40 p-3 transition-colors",
        isOver && "border-primary/50 bg-primary/5",
      )}
    >
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className={cn("h-2 w-2 rounded-full", DEAL_STAGE_COLORS[stage])}
          />
          <h3 className="text-sm font-semibold">{DEAL_STAGE_LABELS[stage]}</h3>
          <Badge variant="secondary" className="text-xs">
            {count}
          </Badge>
        </div>
      </div>
      <p className="mb-3 text-xs text-muted-foreground">
        {formatCurrency(total)}
      </p>
      <div className="flex flex-1 flex-col gap-2 overflow-y-auto scrollbar-thin">
        {children}
      </div>
    </div>
  );
}

interface DealCardProps {
  deal: Deal;
  clientName: string | null;
  propertyTitle: string | null;
  assignee?: Profile | null;
  isOverlay?: boolean;
}

function DealCard({
  deal,
  clientName,
  propertyTitle,
  assignee,
  isOverlay,
}: DealCardProps) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: deal.id,
  });

  return (
    <Card
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      className={cn(
        "cursor-grab select-none p-3 active:cursor-grabbing",
        isDragging && !isOverlay && "opacity-40",
        isOverlay && "shadow-2xl ring-2 ring-primary",
      )}
    >
      <Link
        href={`/deals/${deal.id}`}
        className="block text-sm font-medium hover:underline"
        onClick={(e) => {
          if (isDragging) e.preventDefault();
        }}
      >
        {deal.title}
      </Link>
      {clientName ? (
        <p className="mt-1 truncate text-xs text-muted-foreground">
          {clientName}
        </p>
      ) : null}
      {propertyTitle ? (
        <p className="truncate text-xs text-muted-foreground">
          {propertyTitle}
        </p>
      ) : null}
      <div className="mt-2 flex items-center justify-between">
        <span className="text-xs font-medium">
          {formatCurrency(deal.amount)}
        </span>
        {assignee ? (
          <Avatar className="h-5 w-5">
            <AvatarFallback className="text-[10px]">
              {initials(assignee.full_name)}
            </AvatarFallback>
          </Avatar>
        ) : null}
      </div>
      {deal.expected_close_date ? (
        <p className="mt-1 text-[10px] text-muted-foreground">
          до {formatDate(deal.expected_close_date)}
        </p>
      ) : null}
    </Card>
  );
}
