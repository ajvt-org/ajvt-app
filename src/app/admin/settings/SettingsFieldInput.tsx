"use client";

import { arabicValidity } from "@/lib/validationMessage";
import { cleanValue, type SettingsField } from "./settingsFields";

const INPUT_TYPE = { number: "number", phone: "tel", url: "url", text: "text" } as const;

export default function SettingsFieldInput({
  field,
  value,
  onChange,
}: {
  field: SettingsField;
  value: string | number | null;
  onChange: (value: string | number) => void;
}) {
  const id = `settings-${field.key}`;
  return (
    <div>
      <label
        className="block text-sm font-bold mb-1.5"
        style={{ color: "var(--text-main)" }}
        htmlFor={id}
      >
        {field.label}
      </label>
      <input
        id={id}
        type={INPUT_TYPE[field.kind]}
        inputMode={field.kind === "phone" ? "numeric" : undefined}
        min={field.min}
        max={field.max}
        step={field.kind === "number" ? 1 : undefined}
        placeholder={field.placeholder}
        value={value ?? ""}
        onChange={(e) => onChange(cleanValue(field, e.target.value))}
        required={!field.optional}
        {...(field.optional ? {} : arabicValidity())}
        className="input"
        dir={field.kind === "number" || field.kind === "text" ? undefined : "ltr"}
      />
      {field.hint && (
        <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
          {field.hint}
        </p>
      )}
    </div>
  );
}
