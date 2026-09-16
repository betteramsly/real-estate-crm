"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type TransitionStartFunction,
} from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Check, Loader2, Search, SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { RelevanceStars } from "@/components/relevance-stars";
import { cn } from "@/lib/utils";

const FILTER_KEYS = [
  "q",
  "city",
  "district",
  "developer",
  "completion_year",
  "installment",
  "maternity",
  "commercial",
  "large",
  "relevance",
] as const;

type ListKey = "city" | "district" | "developer" | "completion_year" | "relevance";
type FlagKey = "installment" | "maternity" | "commercial" | "large";

type FilterDraft = Record<ListKey, string[]> & Record<FlagKey, boolean>;

const EMPTY_DRAFT: FilterDraft = {
  city: [],
  district: [],
  developer: [],
  completion_year: [],
  relevance: [],
  installment: false,
  maternity: false,
  commercial: false,
  large: false,
};

function listFrom(params: URLSearchParams, key: string) {
  return (params.get(key) ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function draftFrom(params: URLSearchParams): FilterDraft {
  return {
    city: listFrom(params, "city"),
    district: listFrom(params, "district"),
    developer: listFrom(params, "developer"),
    completion_year: listFrom(params, "completion_year"),
    relevance: listFrom(params, "relevance"),
    installment: params.get("installment") === "1",
    maternity: params.get("maternity") === "1",
    commercial: params.get("commercial") === "1",
    large: params.get("large") === "1",
  };
}

function FilterCheck({
  checked,
  onChange,
  children,
}: {
  checked: boolean;
  onChange: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      onClick={onChange}
      className="flex min-h-8 w-full items-center gap-2.5 rounded-md px-1 py-1 text-left text-sm transition-colors hover:bg-accent/70"
    >
      <span
        className={cn(
          "flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[2px] border transition-colors",
          checked
            ? "border-primary bg-primary text-primary-foreground"
            : "border-muted-foreground/45 bg-transparent",
        )}
      >
        <Check className={cn("h-3 w-3", checked ? "opacity-100" : "opacity-0")} />
      </span>
      <span className="min-w-0 flex-1 leading-snug text-foreground">{children}</span>
    </button>
  );
}

function FilterSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-1.5 border-b border-border/70 py-4 first:pt-0 last:border-b-0 last:pb-0">
      <h3 className="font-display text-sm font-semibold">{title}</h3>
      <div className="space-y-0.5">{children}</div>
    </section>
  );
}

function FilterOptions({
  items,
  selected,
  onToggle,
  limit = 6,
}: {
  items: string[];
  selected: string[];
  onToggle: (value: string) => void;
  limit?: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const hidden = Math.max(0, items.length - limit);
  const visible = expanded ? items : items.slice(0, limit);

  return (
    <>
      {visible.map((item) => (
        <FilterCheck
          key={item}
          checked={selected.includes(item)}
          onChange={() => onToggle(item)}
        >
          {item}
        </FilterCheck>
      ))}
      {hidden > 0 ? (
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="mt-1 px-1 text-sm text-primary hover:underline"
        >
          {expanded ? "Свернуть" : `Ещё ${hidden}`}
        </button>
      ) : null}
    </>
  );
}

const DESKTOP_GROUPS = [
  { id: "district", title: "Район" },
  { id: "city", title: "Город" },
  { id: "developer", title: "Застройщик" },
  { id: "completion_year", title: "Сдача" },
  { id: "flags", title: "Условия" },
  { id: "relevance", title: "Актуальность" },
] as const;

type DesktopGroupId = (typeof DESKTOP_GROUPS)[number]["id"];

function groupCount(draft: FilterDraft, id: DesktopGroupId) {
  if (id === "flags") {
    return (["installment", "maternity", "commercial", "large"] as const).filter(
      (key) => draft[key],
    ).length;
  }
  return draft[id].length;
}

const FLAG_LABELS: Record<FlagKey, string> = {
  installment: "Рассрочка",
  maternity: "Мат. капитал",
  commercial: "Коммерция",
  large: "Больше 85 м²",
};

function selectedChips(draft: FilterDraft) {
  const chips: { id: string; label: string }[] = [];
  for (const value of draft.district) chips.push({ id: `district:${value}`, label: value });
  for (const value of draft.city) chips.push({ id: `city:${value}`, label: value });
  for (const value of draft.developer) chips.push({ id: `developer:${value}`, label: value });
  for (const value of draft.completion_year) {
    chips.push({ id: `completion_year:${value}`, label: value });
  }
  (["installment", "maternity", "commercial", "large"] as const).forEach((key) => {
    if (draft[key]) chips.push({ id: key, label: FLAG_LABELS[key] });
  });
  for (const value of draft.relevance) {
    chips.push({ id: `relevance:${value}`, label: `${value}★` });
  }
  return chips;
}

function DesktopFilterBoard({
  cities,
  districts,
  developers,
  years,
  draft,
  toggleValue,
  toggleFlag,
  onDone,
}: {
  cities: string[];
  districts: string[];
  developers: string[];
  years: string[];
  draft: FilterDraft;
  toggleValue: (key: ListKey, value: string) => void;
  toggleFlag: (key: FlagKey) => void;
  onDone: () => void;
}) {
  const [group, setGroup] = useState<DesktopGroupId>("district");
  const [needle, setNeedle] = useState("");

  const lists: Record<ListKey, string[]> = {
    city: cities,
    district: districts,
    developer: developers,
    completion_year: years,
    relevance: [],
  };

  const query = needle.trim().toLowerCase();
  const currentItems =
    group === "flags" || group === "relevance"
      ? []
      : lists[group].filter((item) =>
          query ? item.toLowerCase().includes(query) : true,
        );

  return (
    <div className="flex h-[28rem] flex-col">
      <div className="flex min-h-0 flex-1">
        <nav className="w-44 shrink-0 space-y-0.5 overflow-y-auto border-r border-border/50 p-2.5">
          {DESKTOP_GROUPS.map((item) => {
            const count = groupCount(draft, item.id);
            const active = group === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setGroup(item.id);
                  setNeedle("");
                }}
                className={cn(
                  "flex h-9 w-full items-center justify-between rounded-full px-3 text-sm transition-colors",
                  active
                    ? "bg-accent text-foreground"
                    : "text-muted-foreground hover:bg-accent/60 hover:text-foreground",
                )}
              >
                <span className="font-medium">{item.title}</span>
                <span
                  className={cn(
                    "inline-flex h-5 min-w-5 items-center justify-center text-[11px]",
                    count ? "text-primary" : "invisible",
                  )}
                >
                  {count || 0}
                </span>
              </button>
            );
          })}
        </nav>
        <div className="flex min-w-0 flex-1 flex-col">
          {group !== "flags" && group !== "relevance" ? (
            <div className="p-3">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={needle}
                  onChange={(event) => setNeedle(event.target.value)}
                  placeholder="Найти в списке…"
                  className="h-10 rounded-full border-transparent bg-accent/70 pl-9 text-base shadow-none focus-visible:ring-1 focus-visible:ring-ring"
                />
              </div>
            </div>
          ) : null}
          <div className="min-h-0 flex-1 overflow-y-auto p-3 scrollbar-thin">
            {group === "flags" ? (
              <div className="grid max-w-xl grid-cols-2 gap-x-3">
                <FilterCheck
                  checked={draft.installment}
                  onChange={() => toggleFlag("installment")}
                >
                  Рассрочка
                </FilterCheck>
                <FilterCheck
                  checked={draft.maternity}
                  onChange={() => toggleFlag("maternity")}
                >
                  Мат. капитал
                </FilterCheck>
                <FilterCheck
                  checked={draft.commercial}
                  onChange={() => toggleFlag("commercial")}
                >
                  Коммерция
                </FilterCheck>
                <FilterCheck
                  checked={draft.large}
                  onChange={() => toggleFlag("large")}
                >
                  Больше 85 м²
                </FilterCheck>
              </div>
            ) : group === "relevance" ? (
              <div className="grid max-w-lg grid-cols-3 gap-x-3">
                {([1, 2, 3] as const).map((value) => (
                  <FilterCheck
                    key={value}
                    checked={draft.relevance.includes(String(value))}
                    onChange={() => toggleValue("relevance", String(value))}
                  >
                    <RelevanceStars value={value} />
                  </FilterCheck>
                ))}
              </div>
            ) : currentItems.length ? (
              <div className="grid grid-cols-2 gap-x-4 xl:grid-cols-3">
                {currentItems.map((item) => (
                  <FilterCheck
                    key={item}
                    checked={draft[group].includes(item)}
                    onChange={() => toggleValue(group, item)}
                  >
                    {item}
                  </FilterCheck>
                ))}
              </div>
            ) : (
              <p className="px-2 py-6 text-sm text-muted-foreground">
                Ничего не найдено
              </p>
            )}
          </div>
        </div>
      </div>
      <div className="flex items-center justify-end border-t border-border/50 px-4 py-3">
        <Button type="button" className="h-9 px-5" onClick={onDone}>
          Готово
        </Button>
      </div>
    </div>
  );
}

function matchNeedle(value: string, query: string) {
  return !query || value.toLowerCase().includes(query);
}

function FilterGroups({
  cities,
  districts,
  developers,
  years,
  draft,
  toggleValue,
  toggleFlag,
}: {
  cities: string[];
  districts: string[];
  developers: string[];
  years: string[];
  draft: FilterDraft;
  toggleValue: (key: ListKey, value: string) => void;
  toggleFlag: (key: FlagKey) => void;
}) {
  const [needle, setNeedle] = useState("");
  const query = needle.trim().toLowerCase();
  const lists = [
    { key: "district" as const, title: "Район", items: districts.filter((item) => matchNeedle(item, query)), limit: 6 },
    { key: "city" as const, title: "Город", items: cities.filter((item) => matchNeedle(item, query)), limit: 8 },
    { key: "developer" as const, title: "Застройщик", items: developers.filter((item) => matchNeedle(item, query)), limit: 6 },
    { key: "completion_year" as const, title: "Сдача", items: years.filter((item) => matchNeedle(item, query)), limit: 10 },
  ];
  const flags = (Object.entries(FLAG_LABELS) as [FlagKey, string][]).filter(([, label]) =>
    matchNeedle(label, query),
  );
  const showRelevance = matchNeedle("актуальность", query);
  const empty =
    Boolean(query) &&
    lists.every((list) => list.items.length === 0) &&
    flags.length === 0 &&
    !showRelevance;

  return (
    <div className="min-h-[50vh]">
      <div className="sticky top-0 z-10 -mx-1 bg-background px-1 pb-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={needle}
            onChange={(event) => setNeedle(event.target.value)}
            placeholder="Найти в списке…"
            className="h-10 rounded-full border-transparent bg-accent/70 pl-9 text-base shadow-none focus-visible:ring-1 focus-visible:ring-ring"
          />
        </div>
      </div>
      {lists.map((list) =>
        list.items.length ? (
          <FilterSection key={list.key} title={list.title}>
            <FilterOptions
              items={list.items}
              selected={draft[list.key]}
              onToggle={(value) => toggleValue(list.key, value)}
              limit={query ? list.items.length : list.limit}
            />
          </FilterSection>
        ) : null,
      )}
      {flags.length ? (
        <FilterSection title="Условия">
          {flags.map(([key, label]) => (
            <FilterCheck
              key={key}
              checked={draft[key]}
              onChange={() => toggleFlag(key)}
            >
              {label}
            </FilterCheck>
          ))}
        </FilterSection>
      ) : null}
      {showRelevance ? (
        <FilterSection title="Актуальность">
          {([1, 2, 3] as const).map((value) => (
            <FilterCheck
              key={value}
              checked={draft.relevance.includes(String(value))}
              onChange={() => toggleValue("relevance", String(value))}
            >
              <RelevanceStars value={value} />
            </FilterCheck>
          ))}
        </FilterSection>
      ) : null}
      {empty ? (
        <p className="px-1 py-6 text-sm text-muted-foreground">Ничего не найдено</p>
      ) : null}
    </div>
  );
}

export function CatalogFilters({
  cities,
  districts,
  developers,
  years,
  pending,
  startTransition,
  onPendingIntent,
  children,
}: {
  cities: string[];
  districts: string[];
  developers: string[];
  years: string[];
  pending: boolean;
  startTransition: TransitionStartFunction;
  onPendingIntent?: (intent: "apply" | "clear" | "search") => void;
  children?: React.ReactNode;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const liveParams = useRef(new URLSearchParams(params.toString()));
  const popped = useRef(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopOpen, setDesktopOpen] = useState(false);
  const desktopBar = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState(params.get("q") ?? "");
  const [draft, setDraft] = useState(() => draftFrom(params));
  const searchTimer = useRef<number>(0);

  useEffect(() => {
    const onPop = () => {
      popped.current = true;
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  useEffect(() => {
    if (!desktopOpen) return;
    const onPointer = (event: MouseEvent) => {
      if (desktopBar.current?.contains(event.target as Node)) return;
      setDesktopOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setDesktopOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [desktopOpen]);

  useEffect(() => {
    const incoming = params.toString();
    if (incoming === liveParams.current.toString()) {
      setDraft(draftFrom(params));
      return;
    }
    if (!popped.current) return;
    popped.current = false;
    liveParams.current = new URLSearchParams(incoming);
    setDraft(draftFrom(params));
    setQuery(params.get("q") ?? "");
  }, [params]);

  const setParam = useCallback(
    (
      key: string,
      value: string | null,
      intent: "apply" | "search" = "apply",
    ) => {
      const next = new URLSearchParams(liveParams.current.toString());
      if (!value) next.delete(key);
      else next.set(key, value);
      liveParams.current = next;
      const qs = next.toString();
      onPendingIntent?.(intent);
      startTransition(() => {
        router.push(`/properties${qs ? `?${qs}` : ""}`, { scroll: false });
      });
    },
    [onPendingIntent, router, startTransition],
  );

  const applySearch = useCallback(
    (value: string) => {
      window.clearTimeout(searchTimer.current);
      const next = value.trim();
      if (next === (liveParams.current.get("q") ?? "").trim()) return;
      setParam("q", next || null, "search");
    },
    [setParam],
  );

  useEffect(() => {
    searchTimer.current = window.setTimeout(() => applySearch(query), 300);
    return () => window.clearTimeout(searchTimer.current);
  }, [applySearch, query]);

  const toggleValue = (key: ListKey, value: string) => {
    const current = draft[key];
    const next = current.includes(value)
      ? current.filter((item) => item !== value)
      : [...current, value];
    setDraft({ ...draft, [key]: next });
    setParam(key, next.length ? next.join(",") : null);
  };

  const toggleFlag = (key: FlagKey) => {
    const next = !draft[key];
    setDraft({ ...draft, [key]: next });
    setParam(key, next ? "1" : null);
  };

  const facetCount = FILTER_KEYS.filter((key) => {
    if (key === "q") return false;
    if (key in draft && typeof draft[key as FlagKey] === "boolean") {
      return draft[key as FlagKey];
    }
    return (draft[key as ListKey] ?? []).length > 0;
  }).length;
  const hasQuery = Boolean(query.trim() || params.get("q"));
  const hasFilters = facetCount > 0 || hasQuery;
  const filtersBusy = desktopOpen || mobileOpen || pending;
  const showReset = hasFilters || filtersBusy;

  const reset = () => {
    window.clearTimeout(searchTimer.current);
    setQuery("");
    setDraft(EMPTY_DRAFT);
    liveParams.current = new URLSearchParams();
    onPendingIntent?.("clear");
    startTransition(() => {
      router.push("/properties", { scroll: false });
    });
  };

  const filterTrigger = (
    <>
      <SlidersHorizontal className="h-4 w-4" />
      Фильтры
      <span
        className={cn(
          "inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[11px] text-primary-foreground",
          facetCount ? "visible" : "invisible",
        )}
      >
        {facetCount || 0}
      </span>
    </>
  );

  return (
    <div className="space-y-4">
      {desktopOpen ? (
        <div className="fixed inset-0 z-20 hidden bg-black/30 md:block" />
      ) : null}
      <div
        className={cn(
          "sticky top-14 z-30 -mx-4 px-4 py-3 md:-mx-8 md:px-8",
          desktopOpen
            ? "border-b-transparent bg-transparent"
            : "border-b bg-background/95 backdrop-blur",
        )}
      >
        <div ref={desktopBar} className="relative">
          <div className="flex h-11 min-w-0 items-center">
            <div
              className={cn(
                "flex min-w-0 w-full items-center rounded-full border bg-background/80 pr-1 shadow-sm",
                desktopOpen
                  ? "border-white/10 bg-popover"
                  : "border-input",
              )}
            >
              <div className="relative min-w-0 flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="ЖК, застройщик, район..."
                  className="h-11 min-w-0 rounded-full border-0 bg-transparent pl-9 text-base shadow-none focus-visible:ring-0"
                  onKeyDown={(event) => {
                    if (event.key === "Enter") applySearch(query);
                  }}
                />
              </div>
              <Button
                type="button"
                variant={facetCount || desktopOpen ? "default" : "ghost"}
                aria-expanded={desktopOpen}
                className="hidden h-9 min-w-[7.5rem] shrink-0 rounded-full focus-visible:ring-1 focus-visible:ring-offset-0 md:inline-flex"
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => setDesktopOpen((open) => !open)}
              >
                {filterTrigger}
              </Button>
              <Button
                type="button"
                variant={facetCount ? "default" : "ghost"}
                className="h-9 shrink-0 rounded-full px-3 md:hidden"
                onClick={() => setMobileOpen(true)}
              >
                {filterTrigger}
              </Button>
              <div
                className={cn(
                  "grid transition-[grid-template-columns] duration-200 ease-out motion-reduce:transition-none",
                  showReset ? "grid-cols-[2.25rem]" : "grid-cols-[0fr]",
                )}
                aria-hidden={!showReset}
              >
                <div className="min-w-0 overflow-hidden">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-9 w-9 rounded-full"
                    disabled={!showReset}
                    onClick={() => {
                      if (hasFilters || pending) {
                        reset();
                        return;
                      }
                      setDesktopOpen(false);
                      setMobileOpen(false);
                    }}
                    aria-label={hasFilters ? "Сбросить фильтры" : "Закрыть фильтры"}
                    tabIndex={showReset ? 0 : -1}
                  >
                    {pending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <X className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
          {desktopOpen ? (
            <div className="absolute left-0 right-0 top-[calc(100%+0.75rem)] z-40 hidden overflow-hidden rounded-3xl border border-white/10 bg-popover shadow-[0_24px_80px_rgba(0,0,0,0.45)] md:block">
                <div className="flex h-12 items-center gap-3 border-b border-border/50 px-4">
                  <p className="shrink-0 font-display text-sm font-semibold">Фильтры</p>
                  <div className="flex min-w-0 flex-1 items-center gap-1.5 overflow-x-auto">
                    {selectedChips(draft).map((chip) => (
                      <button
                        key={chip.id}
                        type="button"
                        onClick={() => {
                          if (chip.id in FLAG_LABELS) {
                            toggleFlag(chip.id as FlagKey);
                            return;
                          }
                          const sep = chip.id.indexOf(":");
                          toggleValue(
                            chip.id.slice(0, sep) as ListKey,
                            chip.id.slice(sep + 1),
                          );
                        }}
                        className="inline-flex h-7 shrink-0 items-center gap-1 rounded-full bg-accent px-2.5 text-xs text-foreground hover:bg-accent/80"
                      >
                        {chip.label}
                        <X className="h-3 w-3 text-muted-foreground" />
                      </button>
                    ))}
                  </div>
                  <button
                    type="button"
                    onClick={reset}
                    className={cn(
                      "shrink-0 text-sm text-muted-foreground transition-colors hover:text-foreground",
                      !hasFilters && "invisible",
                    )}
                  >
                    Сбросить всё
                  </button>
                </div>
                <DesktopFilterBoard
                  cities={cities}
                  districts={districts}
                  developers={developers}
                  years={years}
                  draft={draft}
                  toggleValue={toggleValue}
                  toggleFlag={toggleFlag}
                  onDone={() => setDesktopOpen(false)}
                />
              </div>
          ) : null}
        </div>
      </div>

      <div className="min-w-0">{children}</div>

      <Dialog open={mobileOpen} onOpenChange={setMobileOpen}>
        <DialogContent className="fixed inset-x-0 bottom-0 top-auto max-h-[85vh] max-w-none translate-x-0 translate-y-0 overflow-y-auto rounded-t-3xl sm:rounded-t-3xl">
          <DialogHeader>
            <DialogTitle className="font-display">Фильтры</DialogTitle>
          </DialogHeader>
          <FilterGroups
            cities={cities}
            districts={districts}
            developers={developers}
            years={years}
            draft={draft}
            toggleValue={toggleValue}
            toggleFlag={toggleFlag}
          />
          <Button className="mt-2 h-11 w-full" onClick={() => setMobileOpen(false)}>
            Показать комплексы
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  );
}
