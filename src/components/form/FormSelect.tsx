"use client";

import { useState } from "react";

const CHEVRON =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%234a9c7e' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E\")";

export const SEARCH_FROM = 8;

function matches(option: string, query: string): boolean {
  return option.trim().includes(query.trim());
}

export default function FormSelect({
  id,
  label,
  placeholder,
  value,
  options,
  onChange,
  hint,
  extraOption,
  search,
}: {
  id: string;
  label: string;
  placeholder: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
  hint?: string;
  extraOption?: { value: string; label: string };
  search?: { placeholder: string; label: string; empty: string };
}) {
  const [query, setQuery] = useState("");
  const searchable = !!search && options.length >= SEARCH_FROM;
  const shown =
    searchable && query.trim()
      ? options.filter((option) => matches(option, query) || option === value)
      : options;

  return (
    <div>
      <label
        htmlFor={id}
        className="block text-sm font-bold mb-1.5"
        style={{ color: "var(--text-main)" }}
      >
        {label} <span style={{ color: "var(--copper-500)" }}>*</span>
      </label>
      {searchable && (
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={search!.placeholder}
          aria-label={search!.label}
          className="input mb-2"
        />
      )}
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="input"
        style={{
          appearance: "none",
          backgroundImage: CHEVRON,
          backgroundRepeat: "no-repeat",
          backgroundPosition: "left 12px center",
          paddingLeft: "36px",
        }}
      >
        <option value="" disabled>
          {placeholder}
        </option>
        {shown.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
        {extraOption && <option value={extraOption.value}>{extraOption.label}</option>}
      </select>
      {searchable && shown.length === 0 && (
        <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
          {search!.empty}
        </p>
      )}
      {hint && (
        <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
          {hint}
        </p>
      )}
    </div>
  );
}
