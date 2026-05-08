"use client";

import * as React from "react";
import { Input } from "@/components/ui/input";

function formatAmountInput(value: string) {
  const digitsOnly = value.replace(/\D/g, "");
  if (!digitsOnly) return "";
  return new Intl.NumberFormat("ru-RU", {
    maximumFractionDigits: 0,
  }).format(Number(digitsOnly));
}

interface AmountInputProps
  extends Omit<
    React.ComponentProps<typeof Input>,
    "type" | "inputMode" | "value" | "defaultValue" | "onChange"
  > {
  defaultValue?: string | number | null;
}

export function AmountInput({ defaultValue, ...props }: AmountInputProps) {
  const [value, setValue] = React.useState(() =>
    formatAmountInput(String(defaultValue ?? "")),
  );

  return (
    <Input
      {...props}
      type="text"
      inputMode="numeric"
      value={value}
      onChange={(event) => {
        setValue(formatAmountInput(event.target.value));
      }}
    />
  );
}
