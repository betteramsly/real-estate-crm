"use client";

import * as React from "react";
import { Check, Copy, Link2, Loader2, Share2, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { usePresentationBasket } from "@/components/catalog/presentation-basket";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  createCatalogShareAction,
  listCatalogSharesAction,
  revokeCatalogShareAction,
} from "@/lib/actions/catalog-share";
import {
  SHARE_TTL_DAYS,
  emptyShareStats,
  sharePath,
  shareStatsLabel,
  whatsappShareUrl,
  type CatalogShareStats,
  type CatalogShareWithStats,
  type ShareTtlDays,
} from "@/lib/catalog-share";
import { formatDate } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import type { CatalogShare } from "@/lib/types";

function pageUrl(token: string) {
  return `${window.location.origin}${sharePath(token)}`;
}

export function ShareClientButton({ compact = false }: { compact?: boolean }) {
  const { items, ids, remove } = usePresentationBasket();
  const [open, setOpen] = React.useState(false);
  const [days, setDays] = React.useState<ShareTtlDays>(3);
  const [pending, startTransition] = React.useTransition();
  const [created, setCreated] = React.useState<CatalogShare | null>(null);
  const [active, setActive] = React.useState<CatalogShareWithStats[]>([]);
  const [copied, setCopied] = React.useState(false);

  const refreshActive = React.useCallback(() => {
    void listCatalogSharesAction().then(setActive);
  }, []);

  React.useEffect(() => {
    if (open) refreshActive();
  }, [open, refreshActive]);

  const create = () => {
    startTransition(async () => {
      const result = await createCatalogShareAction({
        propertyIds: ids,
        days,
      });
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setCreated(result.share);
      setActive((current) => [
        { ...result.share, stats: emptyShareStats() },
        ...current.filter((row) => row.id !== result.share.id),
      ]);
      toast.success("Ссылка для клиента готова");
    });
  };

  const revoke = (id: string) => {
    startTransition(async () => {
      const result = await revokeCatalogShareAction(id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setActive((current) => current.filter((row) => row.id !== id));
      if (created?.id === id) setCreated(null);
      toast.success("Ссылка отозвана");
    });
  };

  const copy = async (token: string) => {
    try {
      await navigator.clipboard.writeText(pageUrl(token));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
      toast.success("Ссылка скопирована");
    } catch {
      toast.error("Не удалось скопировать");
    }
  };

  const sendWhatsapp = (token: string) => {
    window.open(whatsappShareUrl(pageUrl(token)), "_blank", "noopener,noreferrer");
  };

  return (
    <>
      <Button
        type="button"
        variant={items.length ? "default" : "outline"}
        size={compact ? "sm" : "default"}
        onClick={() => setOpen(true)}
        aria-label="Ссылка клиенту"
        className={cn(compact && "relative max-md:h-9 max-md:w-9 max-md:px-0")}
      >
        <Share2 className="h-4 w-4" />
        <span className={cn(compact && "max-md:sr-only")}>Клиенту</span>
        <span
          className={cn(
            "inline-flex min-w-5 justify-center text-xs tabular-nums",
            compact && "max-md:sr-only",
            items.length ? "" : "invisible",
          )}
        >
          {items.length || 0}
        </span>
        {compact && items.length ? (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] text-primary-foreground md:hidden">
            {items.length}
          </span>
        ) : null}
      </Button>

      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next);
          if (!next) {
            setCreated(null);
            setCopied(false);
          }
        }}
      >
        <DialogContent className="max-h-[min(88vh,40rem)] overflow-y-auto rounded-3xl sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display">Ссылка клиенту</DialogTitle>
            <DialogDescription>
              Клиент увидит только отмеченные комплексы. Если в профиле указан
              телефон, он сможет написать вам в WhatsApp.
            </DialogDescription>
          </DialogHeader>

          {created ? (
            <CreatedLink
              share={created}
              stats={
                active.find((row) => row.id === created.id)?.stats ??
                emptyShareStats()
              }
              copied={copied}
              pending={pending}
              onCopy={() => void copy(created.token)}
              onWhatsapp={() => sendWhatsapp(created.token)}
              onRevoke={() => revoke(created.id)}
            />
          ) : null}

          <section className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-medium">Подборка</h3>
              <p className="text-xs text-muted-foreground">
                {items.length} из 12
              </p>
            </div>
            {items.length ? (
              <ul className="space-y-2">
                {items.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center justify-between gap-3 rounded-2xl border bg-card px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{item.title}</p>
                      {item.developer ? (
                        <p className="truncate text-xs text-muted-foreground">
                          {item.developer}
                        </p>
                      ) : null}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      aria-label={`Убрать ${item.title}`}
                      onClick={() => remove(item.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="rounded-2xl border border-dashed px-3 py-4 text-sm text-muted-foreground">
                Отметьте комплексы закладкой на карточке. В режиме показа
                открытый объект попадает в подборку сам.
              </p>
            )}
          </section>

          <section className="space-y-3">
            <h3 className="text-sm font-medium">Срок действия</h3>
            <div className="grid grid-cols-3 gap-2">
              {SHARE_TTL_DAYS.map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setDays(value)}
                  className={cn(
                    "rounded-full border px-3 py-2 text-sm transition-colors duration-200 ease-luxury",
                    days === value
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-input bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                  )}
                >
                  {value === 1 ? "1 день" : value === 7 ? "7 дней" : `${value} дня`}
                </button>
              ))}
            </div>
            <Button
              type="button"
              className="w-full"
              disabled={pending || items.length === 0}
              onClick={create}
            >
              {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
              Создать ссылку
            </Button>
          </section>

          {active.length ? (
            <section className="space-y-3">
              <h3 className="text-sm font-medium">Активные ссылки</h3>
              <ul className="space-y-2">
                {active.map((share) => (
                  <li
                    key={share.id}
                    className="flex items-center justify-between gap-3 rounded-2xl border px-3 py-2"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {share.title ?? "Подборка"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        до {formatDate(share.expires_at)} · {share.property_ids.length} ЖК
                      </p>
                      <p
                        className={cn(
                          "text-xs",
                          share.stats.contacts > 0
                            ? "text-foreground"
                            : "text-muted-foreground",
                        )}
                      >
                        {shareStatsLabel(share.stats)}
                      </p>
                    </div>
                    <div className="flex shrink-0 gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label="Копировать ссылку"
                        onClick={() => void copy(share.token)}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        aria-label="Отозвать ссылку"
                        disabled={pending}
                        onClick={() => revoke(share.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}

function CreatedLink({
  share,
  stats,
  copied,
  pending,
  onCopy,
  onWhatsapp,
  onRevoke,
}: {
  share: CatalogShare;
  stats: CatalogShareStats;
  copied: boolean;
  pending: boolean;
  onCopy: () => void;
  onWhatsapp: () => void;
  onRevoke: () => void;
}) {
  return (
    <section className="space-y-3 rounded-2xl border bg-card p-4">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
        Готово к отправке
      </p>
      <p className="break-all rounded-xl bg-muted px-3 py-2 text-xs">
        {typeof window === "undefined" ? sharePath(share.token) : pageUrl(share.token)}
      </p>
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" onClick={onCopy}>
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          Копировать
        </Button>
        <Button type="button" size="sm" variant="outline" onClick={onWhatsapp}>
          <Share2 className="h-4 w-4" />
          WhatsApp
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          disabled={pending}
          onClick={onRevoke}
        >
          Отозвать
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Действует до {formatDate(share.expires_at)}
      </p>
      <p
        className={cn(
          "text-xs",
          stats.contacts > 0 ? "text-foreground" : "text-muted-foreground",
        )}
      >
        {shareStatsLabel(stats)}
      </p>
    </section>
  );
}