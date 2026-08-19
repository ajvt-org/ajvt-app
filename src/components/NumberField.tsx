"use client";

import { useState } from "react";

// A number input that keeps what was typed rather than what the number reads
// back as, so clearing it leaves it empty instead of snapping to 0 and putting
// the next digit after it.
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
    <input
      id={id}
      type="number"
      inputMode="numeric"
      min={min}
      max={max}
      dir="ltr"
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
