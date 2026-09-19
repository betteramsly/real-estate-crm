"use client";

import * as React from "react";
import { Check, ChevronsUpDown, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export function SuggestInput({
  id,
  name,
  label,
  options,
  customOptions = [],
  defaultValue = "",
  placeholder,
  onCommit,
  onRemove,
}: {
  id: string;
  name: string;
  label?: string;
  options: string[];
  customOptions?: string[];
  defaultValue?: string;
  placeholder?: string;
  onCommit?: (value: string) => void;
  onRemove?: (value: string) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [value, setValue] = React.useState(defaultValue);
  const [query, setQuery] = React.useState(defaultValue);
  const [draft, setDraft] = React.useState("");
  const rootRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const draftRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    setValue(defaultValue);
    setQuery(defaultValue);
  }, [defaultValue]);

  React.useEffect(() => {
    if (!open) return;
    const onPointer = (event: MouseEvent) => {
      if (rootRef.current?.contains(event.target as Node)) return;
      setOpen(false);
      const cleaned = query.trim();
      setValue(cleaned);
      setQuery(cleaned);
      if (cleaned) onCommit?.(cleaned);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        inputRef.current?.blur();
      }
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [onCommit, open, query]);

  const needle = query.trim().toLowerCase();
  const customSet = React.useMemo(
    () =>
      new Set(
        customOptions.map((item) => item.trim().toLowerCase()).filter(Boolean),
      ),
    [customOptions],
  );
  const unique = React.useMemo(
    () =>
      Array.from(new Set(options.map((item) => item.trim()).filter(Boolean))),
    [options],
  );

  const filtered = React.useMemo(() => {
    if (!needle) return unique;
    return unique.filter((item) => item.toLowerCase().includes(needle));
  }, [needle, unique]);

  const exists = (raw: string) => {
    const next = raw.trim().toLowerCase();
    return Boolean(next) && unique.some((item) => item.toLowerCase() === next);
  };

  const commit = (next: string) => {
    const cleaned = next.trim();
    setValue(cleaned);
    setQuery(cleaned);
    setDraft("");
    setOpen(false);
    if (cleaned) onCommit?.(cleaned);
  };

  const addFromDraft = () => {
    const next = draft.trim();
    if (!next) {
      draftRef.current?.focus();
      return;
    }
    commit(next);
  };

  const addLabel = label ? label.toLowerCase() : "значение";

  return (
    <div ref={rootRef} className="relative">
      <div className="relative">
        <Input
          ref={inputRef}
          id={id}
          name={name}
          value={query}
          placeholder={placeholder}
          autoComplete="off"
          aria-label={label}
          aria-expanded={open}
          aria-controls={`${id}-suggestions`}
          onFocus={() => setOpen(true)}
          onClick={() => setOpen(true)}
          onChange={(event) => {
            setQuery(event.target.value);
            setOpen(true);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              const typed = query.trim();
              if (typed && !exists(typed)) commit(typed);
              else if (filtered[0]) commit(filtered[0]);
              else commit(typed);
            }
          }}
          className="pr-9"
        />
        <ChevronsUpDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      </div>

      {open ? (
        <div
          id={`${id}-suggestions`}
          role="listbox"
          className="absolute left-0 right-0 z-50 mt-1 overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md"
        >
          <div className="max-h-44 overflow-y-auto p-1">
            {filtered.map((item) => {
              const active = item === value;
              const removable = customSet.has(item.toLowerCase());
              return (
                <div
                  key={item}
                  className={cn(
                    "flex w-full items-center gap-1 rounded-md hover:bg-accent",
                    active && "bg-accent",
                  )}
                >
                  <button
                    type="button"
                    role="option"
                    aria-selected={active}
                    className="flex min-w-0 flex-1 items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm"
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => commit(item)}
                  >
                    <Check
                      className={cn(
                        "h-3.5 w-3.5 shrink-0",
                        active ? "opacity-100" : "opacity-0",
                      )}
                    />
                    <span className="min-w-0 truncate">{item}</span>
                  </button>
                  {removable && onRemove ? (
                    <button
                      type="button"
                      aria-label={`Удалить ${item}`}
                      title="Удалить из списка"
                      className="mr-1 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/15 hover:text-destructive"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={(event) => {
                        event.stopPropagation();
                        onRemove(item);
                        if (value.toLowerCase() === item.toLowerCase()) {
                          setValue("");
                          setQuery("");
                        }
                      }}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  ) : null}
                </div>
              );
            })}
            {!filtered.length ? (
              <p className="px-2.5 py-3 text-sm text-muted-foreground">
                Нет в списке — добавьте ниже
              </p>
            ) : null}
          </div>

          <div
            className="flex gap-2 border-t border-border/60 bg-popover p-2"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <Input
              ref={draftRef}
              value={draft}
              placeholder={`Добавить ${addLabel}…`}
              className="h-9 min-w-0 flex-1 bg-background"
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                event.stopPropagation();
                if (event.key === "Enter") {
                  event.preventDefault();
                  addFromDraft();
                }
              }}
              onClick={(event) => event.stopPropagation()}
            />
            <Button
              type="button"
              size="sm"
              className="h-9 shrink-0 gap-1 px-3"
              onMouseDown={(event) => event.preventDefault()}
              onClick={(event) => {
                event.stopPropagation();
                addFromDraft();
              }}
            >
              <Plus className="h-4 w-4" />
              Добавить
            </Button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
