"use client";

import { useState } from "react";
import Icon from "@/components/Icon";
import { multiSelect as texts } from "@/lib/texts";

export interface MultiSelectOption {
  value: string;
  label: string;
}

function summaryOf(options: MultiSelectOption[], chosen: string[], allLabel: string): string {
  if (chosen.length === 0) return allLabel;
  return options.find((option) => option.value === chosen[0])?.label ?? chosen[0];
}

function toggled(chosen: string[], value: string): string[] {
  return chosen.includes(value) ? chosen.filter((kept) => kept !== value) : [...chosen, value];
}

export default function MultiSelect({
  label,
  allLabel,
  options,
  chosen,
  onChange,
  className = "input input-sm w-full",
}: {
  label: string;
  allLabel: string;
  options: MultiSelectOption[];
  chosen: string[];
  onChange: (next: string[]) => void;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <div className="relative min-w-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={label}
        aria-expanded={open}
        className={`${className} flex items-center gap-1.5 text-start`}
      >
        <span className="truncate flex-1">{summaryOf(options, chosen, allLabel)}</span>
        {chosen.length > 1 && (
          <span className="badge badge-numeral shrink-0" dir="ltr">
            +{chosen.length - 1}
          </span>
        )}
        <span className="shrink-0 flex" style={{ color: "var(--mint-500)" }}>
          <Icon name="chevronDown" size={16} />
        </span>
      </button>
      {open && (
        <>
          <button
            type="button"
            aria-label={texts.closeList}
            className="fixed inset-0 z-10 cursor-default"
            onClick={() => setOpen(false)}
          />
          <div
            role="group"
            aria-label={label}
            className="absolute start-0 top-full mt-1 z-20 rounded-xl overflow-y-auto min-w-full"
            style={{
              background: "white",
              border: "1px solid var(--mint-100)",
              maxHeight: "16rem",
              width: "max-content",
              maxWidth: "80vw",
            }}
          >
            {options.map((option) => (
              <label
                key={option.value}
                className="flex items-center gap-2 text-xs font-bold px-3 py-2.5 cursor-pointer"
                style={{ color: "var(--text-main)" }}
              >
                <input
                  type="checkbox"
                  checked={chosen.includes(option.value)}
                  onChange={() => onChange(toggled(chosen, option.value))}
                />
                {option.label}
              </label>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
