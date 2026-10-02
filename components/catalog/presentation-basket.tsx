"use client";

import * as React from "react";
import { toast } from "sonner";
import { QUOTE_MAX } from "@/lib/apartment-quote";
import { SHARE_MAX_PROPERTIES } from "@/lib/catalog-share";
import type { ApartmentQuote, PresentationBasketItem } from "@/lib/types";

const STORAGE_KEY = "mc_present_basket_v1";
const QUOTE_STORAGE_KEY = "mc_present_quotes_v1";

export type BasketQuote = {
  id: string;
  propertyId: string | null;
  propertyTitle: string | null;
  area: number | null;
  termLabel: string;
  total: number;
  monthly: number;
  months: number;
  floorPlanUrl: string | null;
};

export type BasketSource = {
  id: string;
  title: string;
  developer?: string | null;
  cover_url?: string | null;
};

type PresentationBasketContextValue = {
  items: PresentationBasketItem[];
  ids: string[];
  quotes: BasketQuote[];
  has: (id: string) => boolean;
  hasQuote: (id: string) => boolean;
  add: (property: BasketSource) => void;
  toggle: (property: BasketSource) => void;
  remove: (id: string) => void;
  addQuote: (quote: BasketQuote) => void;
  removeQuote: (id: string) => void;
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

function readStoredQuotes(): BasketQuote[] {
  try {
    const raw = window.localStorage.getItem(QUOTE_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter(
        (row): row is BasketQuote =>
          Boolean(row) &&
          typeof row === "object" &&
          typeof (row as BasketQuote).id === "string" &&
          typeof (row as BasketQuote).termLabel === "string" &&
          typeof (row as BasketQuote).total === "number",
      )
      .slice(0, QUOTE_MAX);
  } catch {
    return [];
  }
}

export function basketQuoteFromCalculation(quote: ApartmentQuote): BasketQuote | null {
  if (!quote.calculation_id) return null;
  return {
    id: quote.calculation_id,
    propertyId: quote.property_id,
    propertyTitle: quote.property_title,
    area: quote.area,
    termLabel: quote.term_label,
    total: quote.total,
    monthly: quote.monthly,
    months: quote.months,
    floorPlanUrl: quote.floor_plan_url,
  };
}

export function PresentationBasketProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [items, setItems] = React.useState<PresentationBasketItem[]>([]);
  const [quotes, setQuotes] = React.useState<BasketQuote[]>([]);
  const [ready, setReady] = React.useState(false);

  React.useEffect(() => {
    setItems(readStored());
    setQuotes(readStoredQuotes());
    setReady(true);
  }, []);

  React.useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
      window.localStorage.setItem(QUOTE_STORAGE_KEY, JSON.stringify(quotes));
    } catch {
      // private mode / quota
    }
  }, [items, quotes, ready]);

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

  const clear = React.useCallback(() => {
    setItems([]);
    setQuotes([]);
  }, []);

  const addQuote = React.useCallback((quote: BasketQuote) => {
    setQuotes((current) => {
      const rest = current.filter((item) => item.id !== quote.id);
      if (rest.length >= QUOTE_MAX && !current.some((item) => item.id === quote.id)) {
        toast.error(`В подборке максимум ${QUOTE_MAX} расчётов`);
        return current;
      }
      return [...rest, quote];
    });
  }, []);

  const removeQuote = React.useCallback((id: string) => {
    setQuotes((current) => current.filter((item) => item.id !== id));
  }, []);

  const value = React.useMemo<PresentationBasketContextValue>(() => {
    const ids = items.map((item) => item.id);
    const idSet = new Set(ids);
    const quoteIds = new Set(quotes.map((item) => item.id));
    return {
      items,
      ids,
      quotes,
      has: (id) => idSet.has(id),
      hasQuote: (id) => quoteIds.has(id),
      add,
      toggle,
      remove,
      addQuote,
      removeQuote,
      clear,
    };
  }, [add, addQuote, clear, items, quotes, remove, removeQuote, toggle]);

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