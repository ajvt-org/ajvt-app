"use client";

import { useState } from "react";
import NumberInput from "./NumberInput";

export default function NumberField({
  id,
  value,
  min,
  max,
  disabled,
  ariaLabel,
  className = "input input-sm",
  onChange,
}: {
  id?: string;
  value: number;
  min?: number;
  max?: number;
  disabled?: boolean;
  ariaLabel?: string;
  className?: string;
  onChange: (value: number) => void;
}) {
  const [text, setText] = useState(String(value));
  const [seen, setSeen] = useState(value);

  if (value !== seen) {
    setSeen(value);
    if (value !== Number(text)) setText(String(value));
  }

  return (
    <NumberInput
      id={id}
      min={min}
      max={max}
      aria-label={ariaLabel}
      disabled={disabled}
      className={className}
      value={text}
      onChange={(e) => {
        const raw = e.target.value;
        setText(raw);
        const next = raw === "" ? 0 : Number(raw);
        setSeen(next);
        onChange(Number.isNaN(next) ? 0 : next);
      }}
    />
  );
}
