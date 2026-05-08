"use client";

import * as React from "react";
import InputMask from "react-input-mask";
import { Input, type InputProps } from "@/components/ui/input";

type PhoneInputProps = Omit<InputProps, "type">;

export function PhoneInput({ className, ...props }: PhoneInputProps) {
  return (
    <InputMask
      mask="+7 (999) 999-99-99"
      maskChar="_"
      alwaysShowMask
      {...props}
    >
      {(inputProps: InputProps) => (
        <Input
          {...inputProps}
          type="tel"
          className={className}
          inputMode="tel"
          autoComplete="tel"
        />
      )}
    </InputMask>
  );
}
