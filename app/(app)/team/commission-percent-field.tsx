"use client";

import * as React from "react";
import {
  AlertCircle,
  Check,
  ChevronDown,
  ChevronUp,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { setRealtorCompanyCommissionPercentAction } from "@/lib/actions/profile";

interface CommissionPercentFieldProps {
  userId: string;
  initialValue: number;
}

function formatPercent(value: number) {
  return Number.isInteger(value) ? String(value) : String(value.toFixed(2));
}

export function CommissionPercentField({
  userId,
  initialValue,
}: CommissionPercentFieldProps) {
  const [pending, startTransition] = React.useTransition();
  const [savedValue, setSavedValue] = React.useState(initialValue);
  const [value, setValue] = React.useState(formatPercent(initialValue));
  const [failedValue, setFailedValue] = React.useState<number | null>(null);
  const [status, setStatus] = React.useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const savedStatusTimer = React.useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  React.useEffect(() => {
    setSavedValue(initialValue);
    setValue(formatPercent(initialValue));
    setFailedValue(null);
    setStatus("idle");
  }, [initialValue]);

  React.useEffect(
    () => () => {
      if (savedStatusTimer.current) clearTimeout(savedStatusTimer.current);
    },
    [],
  );

  const parsedValue = Number(value.replace(",", "."));
  const isValid =
    value.trim() !== "" &&
    Number.isFinite(parsedValue) &&
    parsedValue >= 0 &&
    parsedValue <= 100;
  const roundedValue = isValid ? Math.round(parsedValue * 100) / 100 : 0;
  const isDirty = isValid && roundedValue !== savedValue;
  const updateValue = (nextValue: string) => {
    if (savedStatusTimer.current) {
      clearTimeout(savedStatusTimer.current);
      savedStatusTimer.current = null;
    }
    setValue(nextValue);
    setFailedValue(null);
    setStatus("idle");
  };
  const changeBy = (delta: number) => {
    const currentValue = isValid ? roundedValue : savedValue;
    const nextValue = Math.min(100, Math.max(0, currentValue + delta));
    updateValue(formatPercent(nextValue));
  };

  React.useEffect(() => {
    if (
      !isDirty ||
      !isValid ||
      pending ||
      roundedValue === failedValue
    ) {
      return;
    }

    const submittedValue = roundedValue;
    const timer = setTimeout(() => {
      if (savedStatusTimer.current) {
        clearTimeout(savedStatusTimer.current);
        savedStatusTimer.current = null;
      }
      setStatus("saving");
      startTransition(async () => {
        try {
          await setRealtorCompanyCommissionPercentAction(
            userId,
            submittedValue,
          );
          setSavedValue(submittedValue);
          setValue(formatPercent(submittedValue));
          setStatus("saved");
          if (savedStatusTimer.current) {
            clearTimeout(savedStatusTimer.current);
          }
          savedStatusTimer.current = setTimeout(
            () => setStatus("idle"),
            1400,
          );
        } catch (error) {
          setFailedValue(submittedValue);
          setStatus("error");
          toast.error(
            error instanceof Error
              ? error.message
              : "Не удалось сохранить процент компании",
          );
        }
      });
    }, 700);

    return () => clearTimeout(timer);
  }, [failedValue, isDirty, isValid, pending, roundedValue, userId]);

  return (
    <div className="flex items-center gap-2">
      <div className="relative">
        <label htmlFor={`commission-percent-${userId}`} className="sr-only">
          Процент компании
        </label>
        <Input
          id={`commission-percent-${userId}`}
          type="text"
          inputMode="decimal"
          value={value}
          disabled={pending}
          aria-invalid={!isValid}
          onChange={(event) => updateValue(event.target.value)}
          className="h-9 w-28 pr-14 tabular-nums"
        />
        <span className="pointer-events-none absolute inset-y-0 right-8 flex items-center text-xs text-muted-foreground">
          %
        </span>
        <div className="absolute inset-y-px right-px flex w-7 flex-col overflow-hidden rounded-r-md border-l bg-muted/30">
          <button
            type="button"
            disabled={pending || (isValid && roundedValue >= 100)}
            onClick={() => changeBy(1)}
            className="flex min-h-0 flex-1 items-center justify-center border-b text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary focus-visible:z-10 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-30"
            aria-label="Увеличить процент компании"
          >
            <ChevronUp className="h-3 w-3" strokeWidth={2.25} />
          </button>
          <button
            type="button"
            disabled={pending || (isValid && roundedValue <= 0)}
            onClick={() => changeBy(-1)}
            className="flex min-h-0 flex-1 items-center justify-center text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary focus-visible:z-10 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-30"
            aria-label="Уменьшить процент компании"
          >
            <ChevronDown className="h-3 w-3" strokeWidth={2.25} />
          </button>
        </div>
      </div>
      <span
        className="flex h-4 w-4 shrink-0 items-center justify-center"
        aria-live="polite"
        title={
          status === "saving"
            ? "Сохраняем процент"
            : status === "saved"
              ? "Процент сохранён"
              : status === "error"
                ? "Не удалось сохранить процент"
                : undefined
        }
      >
        {status === "saving" || pending ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        ) : status === "saved" ? (
          <Check className="h-4 w-4 text-emerald-600" />
        ) : status === "error" ? (
          <AlertCircle className="h-4 w-4 text-destructive" />
        ) : null}
      </span>
    </div>
  );
}
