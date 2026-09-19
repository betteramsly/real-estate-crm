"use client";

import * as React from "react";

const STORAGE_KEY = "crm-catalog-filter-extras";

export type CatalogFilterExtraKey =
  | "city"
  | "district"
  | "developer"
  | "completion_year"
  | "installment";

export type CatalogFilterExtras = Record<CatalogFilterExtraKey, string[]>;

const EMPTY: CatalogFilterExtras = {
  city: [],
  district: [],
  developer: [],
  completion_year: [],
  installment: [],
};

function normalize(value: string) {
  return value.trim();
}

function uniqueSorted(values: string[]) {
  return Array.from(
    new Set(values.map(normalize).filter(Boolean)),
  ).sort((a, b) => a.localeCompare(b, "ru"));
}

export function readFilterExtras(): CatalogFilterExtras {
  if (typeof window === "undefined") return { ...EMPTY };
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...EMPTY };
    const parsed = JSON.parse(raw) as Partial<CatalogFilterExtras>;
    return {
      city: uniqueSorted(parsed.city ?? []),
      district: uniqueSorted(parsed.district ?? []),
      developer: uniqueSorted(parsed.developer ?? []),
      completion_year: uniqueSorted(parsed.completion_year ?? []),
      installment: uniqueSorted(parsed.installment ?? []),
    };
  } catch {
    return { ...EMPTY };
  }
}

function writeFilterExtras(next: CatalogFilterExtras) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  window.dispatchEvent(new Event("crm-filter-extras"));
}

export function addFilterExtra(key: CatalogFilterExtraKey, value: string) {
  const cleaned = normalize(value);
  if (!cleaned || typeof window === "undefined") return;
  const current = readFilterExtras();
  writeFilterExtras({
    ...current,
    [key]: uniqueSorted([...current[key], cleaned]),
  });
}

export function removeFilterExtra(key: CatalogFilterExtraKey, value: string) {
  const cleaned = normalize(value);
  if (!cleaned || typeof window === "undefined") return;
  const current = readFilterExtras();
  const nextValues = current[key].filter(
    (item) => item.toLowerCase() !== cleaned.toLowerCase(),
  );
  writeFilterExtras({ ...current, [key]: nextValues });
}

export function isFilterExtra(
  extras: CatalogFilterExtras,
  key: CatalogFilterExtraKey,
  value: string,
) {
  const cleaned = normalize(value).toLowerCase();
  return extras[key].some((item) => item.toLowerCase() === cleaned);
}

export function mergeFilterOptions(base: string[], extras: string[] = []) {
  return uniqueSorted([...base, ...extras]);
}

export function useFilterExtras() {
  const [extras, setExtras] = React.useState<CatalogFilterExtras>(EMPTY);

  React.useEffect(() => {
    const sync = () => setExtras(readFilterExtras());
    sync();
    window.addEventListener("crm-filter-extras", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("crm-filter-extras", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  return extras;
}
