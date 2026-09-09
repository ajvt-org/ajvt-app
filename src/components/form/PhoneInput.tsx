"use client";

import type { CSSProperties } from "react";
import { memberAccount } from "@/lib/texts";

export default function PhoneInput({
  id,
  value,
  onChange,
  placeholder = memberAccount.phonePlaceholder,
  className = "input",
  style,
}: {
  id?: string;
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <input
      id={id}
      type="tel"
      autoComplete="tel"
      inputMode="numeric"
      value={value}
      onChange={(e) => {
        const digits = e.target.value.replace(/\D/g, "").slice(0, 8);
        onChange(digits);
      }}
      placeholder={placeholder}
      dir="ltr"
      maxLength={8}
      className={className}
      style={{ letterSpacing: "0.15em", ...style }}
    />
  );
}
