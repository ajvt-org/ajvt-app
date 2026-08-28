"use client";

type Option = string | { value: string; label: string };

function optionOf(option: Option): { value: string; label: string } {
  return typeof option === "string" ? { value: option, label: option } : option;
}

export default function PickList({
  id,
  label,
  value,
  options,
  onChange,
  placeholder,
  required,
  action,
  hint,
}: {
  id: string;
  label: string;
  value: string;
  options: Option[];
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  action?: React.ReactNode;
  hint?: string;
}) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <label
          className="block text-xs font-bold"
          style={{ color: "var(--text-main)" }}
          htmlFor={id}
        >
          {label}
        </label>
        {action}
      </div>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className="input"
      >
        {placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map(optionOf).map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {hint && (
        <p className="text-[11px] mt-1" style={{ color: "var(--text-muted)" }}>
          {hint}
        </p>
      )}
    </div>
  );
}
