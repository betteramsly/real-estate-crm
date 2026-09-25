"use client";

import * as React from "react";
import { Check, ChevronDown, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export interface SearchableSelectOption {
  value: string;
  label: string;
  keywords?: string;
}

interface SearchableSelectProps {
  id?: string;
  name: string;
  options: SearchableSelectOption[];
  defaultValue?: string;
  placeholder: string;
  searchPlaceholder: string;
  emptyText?: string;
  clearLabel?: string;
  disabled?: boolean;
  className?: string;
}

function normalizeSearch(value: string) {
  return value.toLocaleLowerCase("ru-RU").replaceAll("ё", "е").trim();
}

export function SearchableSelect({
  id,
  name,
  options,
  defaultValue = "",
  placeholder,
  searchPlaceholder,
  emptyText = "Ничего не найдено",
  clearLabel = "Не выбрано",
  disabled = false,
  className,
}: SearchableSelectProps) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [value, setValue] = React.useState(defaultValue);

  React.useEffect(() => {
    setValue(defaultValue);
  }, [defaultValue]);

  const selected = options.find((option) => option.value === value);
  const normalizedQuery = normalizeSearch(query);
  const filtered = normalizedQuery
    ? options.filter((option) =>
        normalizeSearch(`${option.label} ${option.keywords ?? ""}`).includes(
          normalizedQuery,
        ),
      )
    : options;

  const selectValue = (nextValue: string) => {
    setValue(nextValue);
    setOpen(false);
    setQuery("");
  };

  return (
    <>
      <input type="hidden" name={name} value={value} disabled={disabled} />
      <Popover
        open={open}
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen);
          if (!nextOpen) setQuery("");
        }}
      >
        <PopoverTrigger asChild>
          <Button
            id={id}
            type="button"
            variant="outline"
            role="combobox"
            aria-expanded={open}
            disabled={disabled}
            className={cn(
              "w-full justify-between rounded-md px-3 font-normal",
              !selected && "text-muted-foreground",
              className,
            )}
          >
            <span className="truncate">{selected?.label ?? placeholder}</span>
            <ChevronDown className="opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-[var(--radix-popover-trigger-width)] min-w-[260px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-xl p-0 shadow-xl"
        >
          <div className="border-b p-2">
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={searchPlaceholder}
                className="pl-8 pr-8"
              />
              {query ? (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:bg-accent hover:text-foreground"
                  aria-label="Очистить поиск"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              ) : null}
            </div>
          </div>

          <div
            role="listbox"
            className="scrollbar-thin max-h-64 overflow-y-auto p-1.5"
          >
            {!query ? (
              <button
                type="button"
                role="option"
                aria-selected={!value}
                onClick={() => selectValue("")}
                className={cn(
                  "flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-accent-foreground",
                  !value && "bg-accent/70 text-foreground",
                )}
              >
                <span>{clearLabel}</span>
                {!value ? <Check className="h-4 w-4" /> : null}
              </button>
            ) : null}

            {filtered.length > 0 ? (
              filtered.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  role="option"
                  aria-selected={option.value === value}
                  onClick={() => selectValue(option.value)}
                  className={cn(
                    "flex w-full items-center justify-between gap-3 rounded-lg px-2.5 py-2 text-left text-sm transition-colors hover:bg-accent hover:text-accent-foreground",
                    option.value === value && "bg-accent/70",
                  )}
                >
                  <span className="min-w-0 truncate">{option.label}</span>
                  {option.value === value ? (
                    <Check className="h-4 w-4 shrink-0" />
                  ) : null}
                </button>
              ))
            ) : (
              <p className="px-3 py-8 text-center text-sm text-muted-foreground">
                {emptyText}
              </p>
            )}
          </div>
        </PopoverContent>
      </Popover>
    </>
  );
}
