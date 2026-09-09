"use client";

import { settingsForm } from "@/lib/texts";
import type { SettingsToggle } from "./settingsFields";

export default function SettingsSwitch({
  field,
  value,
  onChange,
}: {
  field: SettingsToggle;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  const id = `settings-${field.key}`;
  return (
    <div>
      <div className="flex items-center justify-between gap-3">
        <label className="text-sm font-bold" style={{ color: "var(--text-main)" }} htmlFor={id}>
          {field.label}
        </label>
        <span className="flex shrink-0 items-center gap-1.5">
          <span className="text-xs font-bold" style={{ color: "var(--text-muted)" }}>
            {value ? settingsForm.switchOn : settingsForm.switchOff}
          </span>
          <input
            id={id}
            type="checkbox"
            role="switch"
            checked={value}
            onChange={(e) => onChange(e.target.checked)}
          />
        </span>
      </div>
      {field.hint && (
        <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
          {field.hint}
        </p>
      )}
    </div>
  );
}
