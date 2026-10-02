"use client";

import * as React from "react";
import { ImagePlus, Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { FloorPlanView } from "@/components/catalog/floor-plan-view";
import {
  basketQuoteFromCalculation,
  usePresentationBasket,
} from "@/components/catalog/presentation-basket";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  DISCOUNT_MAX,
  FLOOR_PLAN_SOURCE_MAX_BYTES,
  calculateApartmentQuote,
  defaultInstallmentTerm,
  discountCaption,
  formatArea,
  formatMarkup,
  formatTermMonths,
  installmentNotes,
  parseDecimal,
  parseInstallmentTerms,
  quoteSummary,
  suggestDownPayment,
} from "@/lib/apartment-quote";
import {
  deleteApartmentCalculationAction,
  saveApartmentCalculationAction,
} from "@/lib/actions/apartment-quote";
import { compactTermGroups } from "@/lib/catalog";
import { formatCurrency } from "@/lib/formatters";
import { cn } from "@/lib/utils";
import type {
  ApartmentCalculation,
  CatalogTermGroup,
  QuoteDiscount,
  QuoteDiscountMode,
} from "@/lib/types";

type DiscountDraft = {
  key: string;
  label: string;
  mode: QuoteDiscountMode;
  valueText: string;
};

function discountSignature(discounts: QuoteDiscount[]) {
  return discounts
    .map((discount) => `${discount.label}|${discount.mode}|${discount.value}|${discount.amount}`)
    .join(";");
}

const PLAN_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/jpg",
  "image/pjpeg",
]);

type TermChoice = {
  id: string;
  label: string;
  months: number;
  markupPct: number;
};

function formatGrouped(value: string) {
  const digits = value.replace(/\D/g, "");
  if (!digits) return "";
  return new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(
    Number(digits),
  );
}

function sanitizeArea(raw: string) {
  const cleaned = raw.replace(/[^\d.,]/g, "").replace(".", ",");
  const comma = cleaned.indexOf(",");
  if (comma < 0) return cleaned.replace(/^0+(?=\d)/, "");
  const whole = cleaned.slice(0, comma).replace(/^0+(?=\d)/, "");
  const fraction = cleaned.slice(comma + 1).replace(/,/g, "").slice(0, 2);
  return `${whole || "0"},${fraction}`;
}

function money(value: number | null | undefined) {
  if (!value) return "";
  return formatGrouped(String(Math.round(value)));
}

function floorPlanTypeError() {
  return new Error("Можно загрузить JPG, PNG, WebP или GIF. HEIC сохраните как JPG.");
}

async function rasterizeFloorPlan(file: File) {
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file);
  } catch {
    throw floorPlanTypeError();
  }
  const scale = Math.min(1, 2000 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Не удалось обработать планировку.");
  context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, "image/jpeg", 0.82);
  });
  if (!blob || blob.size > FLOOR_PLAN_SOURCE_MAX_BYTES) {
    throw new Error("Скриншот должен быть меньше 3,5 МБ.");
  }
  return new File([blob], "plan.jpg", { type: "image/jpeg" });
}

async function prepareFloorPlan(file: File) {
  const type = file.type.toLowerCase();
  if (type === "image/heic" || type === "image/heif" || /\.heic$/i.test(file.name)) {
    throw floorPlanTypeError();
  }
  const known =
    PLAN_TYPES.has(type) || /\.(jpe?g|png|webp|gif)$/i.test(file.name);
  if (type === "image/gif") {
    if (file.size <= FLOOR_PLAN_SOURCE_MAX_BYTES) return file;
    throw new Error("Скриншот должен быть меньше 3,5 МБ.");
  }
  if (known && file.size <= FLOOR_PLAN_SOURCE_MAX_BYTES) return file;
  return rasterizeFloorPlan(file);
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block min-w-0 space-y-1.5">
      <span className="block text-xs font-medium leading-4 text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}

function ResultLine({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: string;
  accent?: boolean;
}) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1 py-2.5">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          "text-right text-sm font-medium tabular-nums",
          accent && "text-gold",
        )}
      >
        {value}
      </dd>
    </div>
  );
}

export function ApartmentCalculator({
  propertyId,
  propertyTitle,
  installmentMax,
  installment,
  initialCalculations,
}: {
  propertyId: string;
  propertyTitle: string;
  installmentMax: string | null;
  installment?: CatalogTermGroup[];
  initialCalculations: ApartmentCalculation[];
}) {
  const basket = usePresentationBasket();
  const groups = React.useMemo(
    () => compactTermGroups(installment),
    [installment],
  );
  const terms = React.useMemo(() => parseInstallmentTerms(groups), [groups]);
  const note = installmentNotes(groups);
  const suggestedDown = React.useMemo(() => suggestDownPayment(note), [note]);
  const initialTerm = defaultInstallmentTerm(terms, installmentMax);
  const choices = React.useMemo<TermChoice[]>(() => {
    return [
      { id: "cash", label: "Сразу", months: 0, markupPct: 0 },
      ...terms,
      { id: "custom", label: "Свой срок", months: initialTerm?.months ?? 12, markupPct: initialTerm?.markupPct ?? 0 },
    ];
  }, [initialTerm?.markupPct, initialTerm?.months, terms]);

  const [saved, setSaved] = React.useState(initialCalculations);
  const [calculationId, setCalculationId] = React.useState<string | null>(null);
  const [areaText, setAreaText] = React.useState("");
  const [priceM2Text, setPriceM2Text] = React.useState("");
  const [priceText, setPriceText] = React.useState("");
  const [priceSource, setPriceSource] = React.useState<"m2" | "total">("m2");
  const [termId, setTermId] = React.useState(initialTerm?.id ?? "cash");
  const [customMonths, setCustomMonths] = React.useState(
    String(initialTerm?.months ?? 12),
  );
  const [customMarkup, setCustomMarkup] = React.useState(
    String(initialTerm?.markupPct ?? 0),
  );
  const [downM2Text, setDownM2Text] = React.useState(money(suggestedDown.downM2));
  const [downLumpText, setDownLumpText] = React.useState("");
  const [discounts, setDiscounts] = React.useState<DiscountDraft[]>([]);
  const [promo, setPromo] = React.useState("");
  const discountSeq = React.useRef(0);
  const [planFile, setPlanFile] = React.useState<File | null>(null);
  const [planPreview, setPlanPreview] = React.useState<string | null>(null);
  const [removePlan, setRemovePlan] = React.useState(false);
  const [dragOver, setDragOver] = React.useState(false);
  const [pending, startTransition] = React.useTransition();
  const fileRef = React.useRef<HTMLInputElement>(null);
  const previewUrl = React.useRef<string | null>(null);

  const selected = choices.find((choice) => choice.id === termId) ?? choices[0];
  const months =
    selected?.id === "custom"
      ? Math.round(parseDecimal(customMonths) ?? 0)
      : (selected?.months ?? 0);
  const markupPct =
    selected?.id === "custom"
      ? (parseDecimal(customMarkup) ?? 0)
      : (selected?.markupPct ?? 0);
  const area = parseDecimal(areaText);
  const priceM2 = parseDecimal(priceM2Text);
  const typedPrice = parseDecimal(priceText);

  React.useEffect(() => {
    if (priceSource !== "m2") return;
    if (area && priceM2) setPriceText(money(Math.round(area * priceM2)));
    else if (!area || !priceM2) setPriceText("");
  }, [area, priceM2, priceSource]);

  const quote = calculateApartmentQuote({
    area,
    priceM2,
    price: priceSource === "total" ? typedPrice : area && priceM2 ? Math.round(area * priceM2) : typedPrice,
    markupPct,
    months,
    downM2: parseDecimal(downM2Text) ?? 0,
    downLump: parseDecimal(downLumpText) ?? 0,
    discounts: discounts.map((discount) => ({
      label: discount.label,
      mode: discount.mode,
      value: parseDecimal(discount.valueText) ?? 0,
    })),
    developerPromo: promo,
  });

  const termLabel =
    selected?.id === "custom" ? formatTermMonths(months) : (selected?.label ?? "Сразу");

  const replacePreview = React.useCallback((next: string | null) => {
    if (previewUrl.current) URL.revokeObjectURL(previewUrl.current);
    previewUrl.current = next?.startsWith("blob:") ? next : null;
    setPlanPreview(next);
  }, []);

  React.useEffect(() => {
    return () => {
      if (previewUrl.current) URL.revokeObjectURL(previewUrl.current);
    };
  }, []);

  const takeFile = React.useCallback(
    async (file: File | undefined) => {
      if (!file) return;
      try {
        const prepared = await prepareFloorPlan(file);
        const url = URL.createObjectURL(prepared);
        setPlanFile(prepared);
        setRemovePlan(false);
        replacePreview(url);
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Не удалось прочитать файл.");
      }
    },
    [replacePreview],
  );

  const rootRef = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    function onPaste(event: ClipboardEvent) {
      const file = [...(event.clipboardData?.files ?? [])].find((item) =>
        item.type.startsWith("image/"),
      );
      if (!file) return;
      const root = rootRef.current;
      const active = document.activeElement;
      if (
        root &&
        active instanceof Node &&
        active !== document.body &&
        !root.contains(active)
      ) {
        return;
      }
      event.preventDefault();
      void takeFile(file);
    }
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [takeFile]);

  const loadCalculation = (calculation: ApartmentCalculation) => {
    setCalculationId(calculation.id);
    setAreaText(calculation.area ? sanitizeArea(String(calculation.area).replace(".", ",")) : "");
    setPriceM2Text(money(calculation.price_m2));
    setPriceText(money(calculation.price));
    setPriceSource(calculation.price_m2 ? "m2" : "total");
    const match = choices.find(
      (choice) =>
        choice.id !== "custom" &&
        choice.id !== "cash" &&
        choice.months === calculation.months &&
        choice.markupPct === calculation.markup_pct,
    );
    if (calculation.months === 0) setTermId("cash");
    else if (match) setTermId(match.id);
    else {
      setTermId("custom");
      setCustomMonths(String(calculation.months));
      setCustomMarkup(String(calculation.markup_pct));
    }
    setDownM2Text(money(calculation.down_m2));
    setDownLumpText(money(calculation.down_lump));
    setDiscounts(
      calculation.discounts.map((discount) => ({
        key: `saved-${discountSeq.current++}`,
        label: discount.label === "Скидка" ? "" : discount.label,
        mode: discount.mode,
        valueText:
          discount.mode === "percent"
            ? String(discount.value).replace(".", ",")
            : money(discount.value),
      })),
    );
    setPromo(calculation.developer_promo ?? "");
    setPlanFile(null);
    setRemovePlan(false);
    replacePreview(calculation.floor_plan_url);
  };

  const savedCurrent = saved.find((item) => item.id === calculationId) ?? null;
  const dirty = Boolean(
    planFile ||
      removePlan ||
      !savedCurrent ||
      savedCurrent.area !== (quote?.area ?? null) ||
      savedCurrent.price !== quote?.price ||
      savedCurrent.price_m2 !== (quote?.priceM2 ?? null) ||
      savedCurrent.markup_pct !== quote?.markupPct ||
      savedCurrent.months !== quote?.months ||
      savedCurrent.down_m2 !== quote?.downM2 ||
      savedCurrent.down_lump !== quote?.downLump ||
      savedCurrent.term_label !== termLabel ||
      discountSignature(savedCurrent.discounts) !==
        discountSignature(quote?.discounts ?? []) ||
      (savedCurrent.developer_promo ?? "") !== (quote?.developerPromo ?? ""),
  );
  const inBasket = calculationId ? basket.hasQuote(calculationId) : false;

  const persist = (addToBasket: boolean) => {
    if (!quote) {
      toast.error("Укажите стоимость квартиры.");
      return;
    }
    startTransition(async () => {
      const form = new FormData();
      if (calculationId) form.set("id", calculationId);
      form.set("property_id", propertyId);
      form.set("property_title", propertyTitle);
      if (quote.area) form.set("area", String(quote.area));
      if (quote.priceM2) form.set("price_m2", String(quote.priceM2));
      form.set("price", String(quote.price));
      form.set("markup_pct", String(quote.markupPct));
      form.set("months", String(quote.months));
      form.set("term_label", termLabel);
      form.set("down_m2", String(quote.downM2));
      form.set("down_lump", String(quote.downLump));
      form.set(
        "discounts",
        JSON.stringify(
          discounts.map((discount) => ({
            label: discount.label,
            mode: discount.mode,
            value: parseDecimal(discount.valueText) ?? 0,
          })),
        ),
      );
      form.set("developer_promo", promo);
      if (planFile) form.set("floor_plan", planFile);
      if (removePlan) form.set("remove_floor_plan", "1");
      let result: Awaited<ReturnType<typeof saveApartmentCalculationAction>>;
      try {
        result = await saveApartmentCalculationAction(form);
      } catch {
        toast.error("Не удалось отправить расчёт. Попробуйте ещё раз.");
        return;
      }
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      const calculation = result.calculation;
      setSaved((current) => [
        calculation,
        ...current.filter((item) => item.id !== calculation.id),
      ].slice(0, 8));
      setCalculationId(calculation.id);
      setPlanFile(null);
      setRemovePlan(false);
      replacePreview(calculation.floor_plan_url);
      if (addToBasket) {
        const item = basketQuoteFromCalculation(calculation);
        if (item) basket.addQuote(item);
        basket.add({
          id: propertyId,
          title: propertyTitle,
        });
        toast.success(inBasket ? "Расчёт в подборке обновлён" : "Расчёт добавлен в подборку");
      } else {
        toast.success("Расчёт сохранён");
      }
    });
  };

  const removeSaved = (id: string) => {
    startTransition(async () => {
      const result = await deleteApartmentCalculationAction(id);
      if (!result.ok) {
        toast.error(result.error);
        return;
      }
      setSaved((current) => current.filter((item) => item.id !== id));
      basket.removeQuote(id);
      if (calculationId === id) setCalculationId(null);
      toast.success("Расчёт удалён");
    });
  };

  return (
    <div
      ref={rootRef}
      className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(17.5rem,22rem)] lg:gap-5"
      onDragOver={(event) => {
        if (![...event.dataTransfer.types].includes("Files")) return;
        event.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={(event) => {
        if (event.currentTarget.contains(event.relatedTarget as Node | null)) return;
        setDragOver(false);
      }}
      onDrop={(event) => {
        if (!event.dataTransfer.files.length) return;
        event.preventDefault();
        setDragOver(false);
        void takeFile(event.dataTransfer.files[0]);
      }}
    >
      <div className="order-1 min-w-0 space-y-4">
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Площадь, м²">
            <Input
              inputMode="decimal"
              value={areaText}
              placeholder="54,2"
              className="h-10 text-base tabular-nums"
              onChange={(event) => {
                setPriceSource("m2");
                setAreaText(sanitizeArea(event.target.value));
              }}
            />
          </Field>
          <Field label="Цена за м²">
            <Input
              inputMode="numeric"
              value={priceM2Text}
              placeholder="61 000"
              className="h-10 text-base tabular-nums"
              onChange={(event) => {
                setPriceSource("m2");
                setPriceM2Text(formatGrouped(event.target.value));
              }}
            />
          </Field>
          <Field label="Стоимость">
            <Input
              inputMode="numeric"
              value={priceText}
              placeholder="5 429 000"
              className="h-10 text-base tabular-nums"
              onChange={(event) => {
                const next = formatGrouped(event.target.value);
                setPriceSource("total");
                setPriceText(next);
                const nextPrice = parseDecimal(next);
                const nextArea = parseDecimal(areaText);
                if (nextPrice && nextArea) {
                  setPriceM2Text(money(Math.round(nextPrice / nextArea)));
                }
              }}
            />
          </Field>
        </div>
      </div>

      <div className="order-2 min-w-0 lg:sticky lg:top-4 lg:row-span-2">
        <div className="overflow-hidden rounded-2xl border border-border/70 bg-card" aria-live="polite">
          <div className="border-b border-border/60 px-4 py-4">
            <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
              К оплате
            </p>
            <p className="mt-1 font-display text-[1.65rem] font-semibold leading-none tracking-tight tabular-nums">
              {quote ? formatCurrency(quote.total) : "—"}
            </p>
            <p className="mt-2 text-sm text-muted-foreground">
              {quote && quote.months > 0
                ? `${formatCurrency(quote.monthly)} в месяц · ${termLabel}`
                : quote
                  ? "Оплата сразу, без наценки"
                  : "Введите площадь и цену"}
            </p>
          </div>
          <dl className="divide-y divide-border/60 px-4">
            <ResultLine label="Стоимость" value={quote ? formatCurrency(quote.price) : "—"} />
            {quote?.discounts.map((discount, index) => (
              <ResultLine
                key={`${discount.label}-${index}`}
                label={discountCaption(discount)}
                value={`−${formatCurrency(discount.amount)}`}
                accent
              />
            ))}
            {quote && quote.discounts.length ? (
              <ResultLine
                label="Со скидкой"
                value={formatCurrency(quote.priceAfterDiscount)}
              />
            ) : null}
            <ResultLine label="Площадь" value={formatArea(quote?.area)} />
            <ResultLine
              label="Первый взнос"
              value={quote ? formatCurrency(quote.downPayment) : "—"}
            />
            <ResultLine
              label="Остаток"
              value={
                quote && quote.months > 0
                  ? formatCurrency(Math.max(0, quote.priceAfterDiscount - quote.downPayment))
                  : "—"
              }
            />
            <ResultLine
              label="Наценка на остаток"
              value={quote && quote.months > 0 ? formatMarkup(quote.markupPct) : "без наценки"}
            />
            <ResultLine
              label="Остаток с наценкой"
              value={quote && quote.months > 0 ? formatCurrency(quote.remaining) : "—"}
            />
          </dl>
          {quote?.developerPromo ? (
            <div className="border-t border-gold/30 bg-gold/10 px-4 py-3">
              <p className="text-[11px] font-medium uppercase tracking-[0.16em] text-gold">
                Акция от застройщика
              </p>
              <p className="mt-1 text-sm leading-5">{quote.developerPromo}</p>
            </div>
          ) : null}
          {quote?.downClamped ? (
            <p className="border-t border-border/60 px-4 py-2.5 text-xs text-muted-foreground">
              Взнос больше стоимости — в расчёт берётся вся сумма.
            </p>
          ) : null}
        </div>
      </div>

      <div className="order-3 min-w-0 space-y-4">
        <div className="space-y-2">
          <p className="text-xs font-medium leading-4 text-muted-foreground">Срок</p>
          <div className="flex flex-wrap gap-2">
            {choices.map((choice) => {
              const active = choice.id === termId;
              return (
                <button
                  key={choice.id}
                  type="button"
                  onClick={() => setTermId(choice.id)}
                  className={cn(
                    "h-9 rounded-full border px-3 text-sm transition-colors duration-200 ease-luxury",
                    active
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-input bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                  )}
                >
                  {choice.label}
                  {choice.id !== "cash" && choice.id !== "custom"
                    ? ` · ${formatMarkup(choice.markupPct)}`
                    : ""}
                </button>
              );
            })}
          </div>
        </div>

        {termId === "custom" ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Срок, мес.">
              <Input
                inputMode="numeric"
                value={customMonths}
                className="h-10 text-base tabular-nums"
                onChange={(event) =>
                  setCustomMonths(event.target.value.replace(/\D/g, "").slice(0, 3))
                }
              />
            </Field>
            <Field label="Наценка, %">
              <Input
                inputMode="decimal"
                value={customMarkup}
                className="h-10 text-base tabular-nums"
                onChange={(event) =>
                  setCustomMarkup(sanitizeArea(event.target.value))
                }
              />
            </Field>
          </div>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Первый взнос, ₽/м²">
            <Input
              inputMode="numeric"
              value={downM2Text}
              placeholder="4 000"
              className="h-10 text-base tabular-nums"
              onChange={(event) => setDownM2Text(formatGrouped(event.target.value))}
            />
          </Field>
          <Field label="Первый взнос, суммой">
            <Input
              inputMode="numeric"
              value={downLumpText}
              placeholder="0"
              className="h-10 text-base tabular-nums"
              onChange={(event) => setDownLumpText(formatGrouped(event.target.value))}
            />
          </Field>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-medium leading-4 text-muted-foreground">Скидки</p>
            {discounts.length < DISCOUNT_MAX ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 rounded-full"
                onClick={() =>
                  setDiscounts((current) => [
                    ...current,
                    {
                      key: `new-${discountSeq.current++}`,
                      label: "",
                      mode: "percent",
                      valueText: "",
                    },
                  ])
                }
              >
                <Plus className="h-3.5 w-3.5" />
                Добавить
              </Button>
            ) : null}
          </div>
          {discounts.map((discount, index) => (
            <div
              key={discount.key}
              className="grid gap-2 rounded-2xl border border-border/70 p-3 sm:grid-cols-[minmax(0,1fr)_auto_8.5rem_auto] sm:items-end"
            >
              <Field label={index === 0 ? "Скидка 1" : "Скидка 2"}>
                <Input
                  value={discount.label}
                  maxLength={40}
                  placeholder="Семейная"
                  className="h-10 text-base"
                  onChange={(event) =>
                    setDiscounts((current) =>
                      current.map((item) =>
                        item.key === discount.key
                          ? { ...item, label: event.target.value }
                          : item,
                      ),
                    )
                  }
                />
              </Field>
              <div className="flex gap-1 pb-0.5">
                {(["percent", "amount"] as const).map((mode) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() =>
                      setDiscounts((current) =>
                        current.map((item) =>
                          item.key === discount.key ? { ...item, mode } : item,
                        ),
                      )
                    }
                    className={cn(
                      "h-10 rounded-full border px-3 text-sm tabular-nums transition-colors",
                      discount.mode === mode
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-input bg-background text-muted-foreground hover:bg-accent",
                    )}
                  >
                    {mode === "percent" ? "%" : "₽"}
                  </button>
                ))}
              </div>
              <Field label={discount.mode === "percent" ? "Процент" : "Сумма"}>
                <Input
                  inputMode="decimal"
                  value={discount.valueText}
                  placeholder={discount.mode === "percent" ? "3" : "100 000"}
                  className="h-10 text-base tabular-nums"
                  onChange={(event) => {
                    const next =
                      discount.mode === "percent"
                        ? sanitizeArea(event.target.value)
                        : formatGrouped(event.target.value);
                    setDiscounts((current) =>
                      current.map((item) =>
                        item.key === discount.key ? { ...item, valueText: next } : item,
                      ),
                    );
                  }}
                />
              </Field>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-10 w-10 shrink-0"
                aria-label="Убрать скидку"
                onClick={() =>
                  setDiscounts((current) => current.filter((item) => item.key !== discount.key))
                }
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <label className="block space-y-1.5">
            <span className="text-xs font-medium leading-4 text-muted-foreground">
              Акция от застройщика
            </span>
            <Textarea
              value={promo}
              maxLength={240}
              placeholder="Например, отопление в подарок или перегородки"
              className="min-h-20 rounded-2xl text-base"
              onChange={(event) => setPromo(event.target.value)}
            />
          </label>
        </div>
        {note ? (
          <p className="text-xs leading-5 text-muted-foreground">{note}</p>
        ) : null}

        <div className="space-y-2">
          <p className="text-xs font-medium leading-4 text-muted-foreground">Планировка</p>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            className="sr-only"
            onChange={(event) => {
              void takeFile(event.target.files?.[0]);
              event.target.value = "";
            }}
          />
          {planPreview ? (
            <div className="grid items-center gap-3 sm:grid-cols-[minmax(0,12rem)_minmax(0,1fr)]">
              <FloorPlanView
                src={planPreview}
                alt={`Планировка — ${propertyTitle}`}
                className="aspect-[4/3] w-full rounded-xl border border-border/70"
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileRef.current?.click()}
                >
                  Заменить
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setPlanFile(null);
                    setRemovePlan(true);
                    replacePreview(null);
                  }}
                >
                  Убрать
                </Button>
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className={cn(
                "flex min-h-36 w-full flex-col items-center justify-center gap-2 rounded-2xl border border-dashed px-4 py-5 text-center text-sm text-muted-foreground transition-colors",
                dragOver
                  ? "border-primary bg-primary/5 text-foreground"
                  : "border-border/80 hover:bg-accent/40",
              )}
            >
              <ImagePlus className="h-5 w-5" />
              <span>Перетащите скриншот, вставьте из буфера или выберите файл</span>
              <span className="text-xs">JPG, PNG, WebP до 3,5 МБ</span>
            </button>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            className="min-w-[11.5rem]"
            disabled={pending || !quote || (inBasket && !dirty)}
            onClick={() => persist(true)}
          >
            {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {!calculationId || !inBasket
              ? "В подборку"
              : dirty
                ? "Обновить в подборке"
                : "В подборке"}
          </Button>
          {calculationId && inBasket && !dirty ? (
            <Button
              type="button"
              variant="outline"
              disabled={pending}
              onClick={() => {
                basket.removeQuote(calculationId);
                toast.success("Расчёт убран из подборки");
              }}
            >
              Убрать из подборки
            </Button>
          ) : (
            <Button
              type="button"
              variant="outline"
              disabled={pending || !quote}
              onClick={() => persist(false)}
            >
              Сохранить
            </Button>
          )}
        </div>

        {saved.length ? (
          <div className="space-y-2">
            <p className="text-xs font-medium leading-4 text-muted-foreground">
              Сохранённые
            </p>
            <ul className="space-y-2">
              {saved.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center gap-2 rounded-2xl border border-border/70 bg-card px-3 py-2"
                >
                  <button
                    type="button"
                    onClick={() => loadCalculation(item)}
                    className={cn(
                      "min-w-0 flex-1 truncate text-left text-sm",
                      item.id === calculationId && "font-medium text-primary",
                    )}
                  >
                    {quoteSummary(item)}
                    <span className="ml-2 text-muted-foreground">
                      {formatCurrency(item.total)}
                    </span>
                  </button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0"
                    aria-label="Удалить расчёт"
                    disabled={pending}
                    onClick={() => removeSaved(item.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </div>
    </div>
  );
}
