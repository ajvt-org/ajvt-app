"use client";

import FilterChipRow, { type FilterChip } from "@/components/admin/filters/FilterChipRow";
import { filterSheet } from "@/lib/texts";
import { NO_FILTERS, type MemberFilters } from "@/lib/memberFilters";

const PAID_LABEL: Record<string, string> = {
  full: filterSheet.paidFull,
  partial: filterSheet.paidPartial,
  none: filterSheet.paidNone,
};

export function standingLabel(standing: string, year: number): string | null {
  if (standing === "current") return `حالي ${year}`;
  if (standing === "former") return `سابق ${year}`;
  return null;
}

function chipsFor(filters: MemberFilters, year: number): FilterChip[] {
  const chips: FilterChip[] = [];
  if (filters.age) chips.push({ key: "age", label: filters.age });
  if (filters.method) chips.push({ key: "method", label: filters.method });
  if (filters.paid && PAID_LABEL[filters.paid])
    chips.push({ key: "paid", label: PAID_LABEL[filters.paid] });
  if (filters.year)
    chips.push({ key: "year", label: filterSheet.yearOption(Number(filters.year)) });
  if (filters.from) chips.push({ key: "from", label: `${filterSheet.from} ${filters.from}` });
  if (filters.to) chips.push({ key: "to", label: `${filterSheet.to} ${filters.to}` });
  const standing = standingLabel(filters.standing, year);
  if (standing) chips.push({ key: "standing", label: standing });
  return chips;
}

export default function FilterChips({
  filters,
  year,
  resultCount,
  onChange,
}: {
  filters: MemberFilters;
  year: number;
  resultCount: number;
  onChange: (next: MemberFilters) => void;
}) {
  return (
    <FilterChipRow
      chips={chipsFor(filters, year)}
      resultCount={resultCount}
      onRemove={(key) => onChange({ ...filters, [key]: "" })}
      onClear={() => onChange({ ...NO_FILTERS, status: filters.status, q: filters.q })}
    />
  );
}
