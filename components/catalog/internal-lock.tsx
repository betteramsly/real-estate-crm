"use client";

import * as React from "react";
import { Lock, Unlock } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  hideInternalBlock,
  loadUnlockedInternal,
  unlockPropertyInternal,
} from "@/lib/actions/catalog-pin";
import type { PropertyInternal } from "@/lib/types";

function InternalContent({ data }: { data: PropertyInternal }) {
  const rows = [
    { label: "Комиссия", value: data.commission },
    { label: "Инвесторские условия", value: data.investor },
    { label: "Стоп-продажи", value: data.stop_sales },
    { label: "Внутренние пометки", value: data.notes },
  ].filter((row) => row.value);

  if (rows.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Служебных пометок по этому комплексу нет.
      </p>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {rows.map((row) => (
        <div
          key={row.label}
          className="rounded-xl border border-border/60 bg-muted/40 px-4 py-3"
        >
          <p className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
            {row.label}
          </p>
          <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed">
            {row.value}
          </p>
        </div>
      ))}
    </div>
  );
}

export function InternalLock({
  propertyId,
  presentMode,
}: {
  propertyId: string;
  presentMode: boolean;
}) {
  const [pin, setPin] = React.useState("");
  const [pending, setPending] = React.useState(false);
  const [internal, setInternal] = React.useState<PropertyInternal | null>(null);

  const hide = React.useCallback(async () => {
    setInternal(null);
    setPin("");
    await hideInternalBlock();
  }, []);

  const unlock = React.useCallback(
    async (value: string) => {
      setPending(true);
      const result = await unlockPropertyInternal(propertyId, value);
      setPending(false);
      if ("error" in result) {
        toast.error(result.error);
        setPin("");
        return;
      }
      setInternal(result.internal);
    },
    [propertyId],
  );

  React.useEffect(() => {
    if (presentMode) {
      setInternal(null);
      setPin("");
      void hideInternalBlock();
      return;
    }

    let cancelled = false;
    void loadUnlockedInternal(propertyId).then((result) => {
      if (cancelled || "locked" in result || "error" in result) return;
      setInternal(result.internal);
    });

    return () => {
      cancelled = true;
    };
  }, [presentMode, propertyId]);

  return (
    <section className="overflow-hidden rounded-2xl border border-border/70 bg-card/80">
      <div className="flex items-center justify-between gap-3 border-b border-border/60 px-5 py-3.5 md:px-6">
        <div className="inline-flex items-center gap-2.5">
          {internal ? (
            <Unlock className="h-4 w-4 text-gold" aria-hidden />
          ) : (
            <Lock className="h-4 w-4 text-muted-foreground" aria-hidden />
          )}
          <h2 className="font-display text-lg font-semibold tracking-tight">
            Служебное
          </h2>
        </div>
        {internal ? (
          <Button variant="ghost" size="sm" onClick={() => void hide()}>
            Скрыть снова
          </Button>
        ) : null}
      </div>

      {internal ? (
        <div className="px-5 py-5 md:px-6">
          <InternalContent data={internal} />
        </div>
      ) : (
        <form
          className="space-y-4 px-5 py-5 md:px-6"
          onSubmit={(event) => {
            event.preventDefault();
            void unlock(pin);
          }}
        >
          <p className="max-w-xl text-sm leading-relaxed text-muted-foreground">
            Комиссии, инвесторские цены и стоп-продажи открываются по коду.
          </p>
          <div className="flex max-w-md flex-col gap-3 sm:flex-row">
            <Input
              inputMode="numeric"
              autoComplete="off"
              name="catalog-pin"
              placeholder="Код доступа"
              aria-label="Код доступа к служебному блоку"
              value={pin}
              onChange={(event) => {
                const next = event.target.value.replace(/\D/g, "").slice(0, 8);
                setPin(next);
                if (next.length === 5) void unlock(next);
              }}
              className="h-11 tracking-[0.3em] sm:flex-1"
            />
            <Button
              type="submit"
              className="h-11 sm:w-36"
              disabled={pending || !pin}
            >
              {pending ? "Проверка…" : "Открыть"}
            </Button>
          </div>
        </form>
      )}
    </section>
  );
}
