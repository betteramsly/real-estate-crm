"use client";

import * as React from "react";
import { toast } from "sonner";
import { SHARE_MAX_PROPERTIES } from "@/lib/catalog-share";
import type { PresentationBasketItem } from "@/lib/types";

const STORAGE_KEY = "mc_present_basket_v1";

export type BasketSource = {
  id: string;
  title: string;
  developer?: string | null;
  cover_url?: string | null;
};

type PresentationBasketContextValue = {
  items: PresentationBasketItem[];
  ids: string[];
  has: (id: string) => boolean;
  add: (property: BasketSource) => void;
  toggle: (property: BasketSource) => void;
  remove: (id: string) => void;
  clear: () => void;
};

const PresentationBasketContext =
  React.createContext<PresentationBasketContextValue | null>(null);

function toItem(property: BasketSource): PresentationBasketItem {
  return {
    id: property.id,
    title: property.title,
    developer: property.developer ?? null,
    cover_url: property.cover_url ?? null,
  };
}

function readStored(): PresentationBasketItem[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (row): row is PresentationBasketItem =>
          Boolean(row) &&
          typeof row === "object" &&
          typeof (row as PresentationBasketItem).id === "string" &&
          typeof (row as PresentationBasketItem).title === "string",
      )
      .slice(0, SHARE_MAX_PROPERTIES);
  } catch {
    return [];
  }
}

export function PresentationBasketProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [items, setItems] = React.useState<PresentationBasketItem[]>([]);
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    setItems(readStored());
    setReady(true);
  }, []);

  React.useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {
      // private mode / quota
    }
  }, [items, ready]);

  const add = React.useCallback((property: BasketSource) => {
    setItems((current) => {
      if (current.some((item) => item.id === property.id)) return current;
      if (current.length >= SHARE_MAX_PROPERTIES) {
        toast.error(`В подборке максимум ${SHARE_MAX_PROPERTIES} комплексов`);
        return current;
      }
      return [...current, toItem(property)];
    });
  }, []);

  const toggle = React.useCallback((property: BasketSource) => {
    setItems((current) => {
      if (current.some((item) => item.id === property.id)) {
        return current.filter((item) => item.id !== property.id);
      }
      if (current.length >= SHARE_MAX_PROPERTIES) {
        toast.error(`В подборке максимум ${SHARE_MAX_PROPERTIES} комплексов`);
        return current;
      }
      return [...current, toItem(property)];
    });
  }, []);

  const remove = React.useCallback((id: string) => {
    setItems((current) => current.filter((item) => item.id !== id));
  }, []);

  const clear = React.useCallback(() => setItems([]), []);

  const value = React.useMemo<PresentationBasketContextValue>(() => {
    const ids = items.map((item) => item.id);
    const idSet = new Set(ids);
    return {
      items,
      ids,
      has: (id) => idSet.has(id),
      add,
      toggle,
      remove,
      clear,
    };
  }, [add, clear, items, remove, toggle]);

  return (
    <PresentationBasketContext.Provider value={value}>
      {children}
    </PresentationBasketContext.Provider>
  );
}

export function useOptionalPresentationBasket() {
  return React.useContext(PresentationBasketContext);
}

export function usePresentationBasket() {
  const context = useOptionalPresentationBasket();
  if (!context) {
    throw new Error("usePresentationBasket must be used within provider");
  }
  return context;
}

export function PresentPropertyBeacon({
  property,
  presentMode,
}: {
  property: BasketSource;
  presentMode: boolean;
}) {
  const { add } = usePresentationBasket();
  React.useEffect(() => {
    if (presentMode) add(property);
  }, [add, presentMode, property]);
  return null;
}