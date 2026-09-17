"use client";

import * as React from "react";
import { Input, type InputProps } from "@/components/ui/input";

type PhoneInputProps = Omit<InputProps, "type">;

function formatRuPhone(raw: string): string {
  const digits = raw.replace(/\D/g, "");
  let rest = digits;
  if (rest.startsWith("8") || rest.startsWith("7")) rest = rest.slice(1);
  rest = rest.slice(0, 10);

  if (!rest) return "";

  const p1 = rest.slice(0, 3);
  const p2 = rest.slice(3, 6);
  const p3 = rest.slice(6, 8);
  const p4 = rest.slice(8, 10);

  let out = `+7 (${p1}`;
  if (p1.length === 3) out += ")";
  if (p2) out += ` ${p2}`;
  if (p3) out += `-${p3}`;
  if (p4) out += `-${p4}`;
  return out;
}

export function PhoneInput({
  className,
  defaultValue,
  value,
  onChange,
  ...props
}: PhoneInputProps) {
  const controlled = value !== undefined;
  const [inner, setInner] = React.useState(() =>
    formatRuPhone(String(defaultValue ?? "")),
  );
  const display = controlled ? formatRuPhone(String(value ?? "")) : inner;

  return (
    <Input
      {...props}
      type="tel"
      inputMode="tel"
      autoComplete="tel"
      className={className}
      value={display}
      onChange={(event) => {
        const next = formatRuPhone(event.target.value);
        if (!controlled) setInner(next);
        event.target.value = next;
        onChange?.(event);
      }}
    />
  );
}
