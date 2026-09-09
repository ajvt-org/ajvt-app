"use client";

import { type FinanceTag } from "@/components/admin/FinanceTagChips";
import FilterChipRow, { type FilterChip } from "@/components/admin/filters/FilterChipRow";
import { filterSheet } from "@/lib/texts";
import { destinationTitle, type DestinationOption } from "@/lib/moneyDestination";
import {
  NO_EXPENSES_FILTERS,
  TAG_CHIP,
  withoutExpensesChip,
  type ExpensesFilters,
} from "./expensesFilters";

export function chipsFor(
  filters: ExpensesFilters,
  destinations: DestinationOption[],
  tags: FinanceTag[],
): FilterChip[] {
  const chips: FilterChip[] = [];
  if (filters.destinationId) {
    const named = destinationTitle(destinations, filters.destinationId);
    if (named) chips.push({ key: "destination", label: named });
  }
  if (filters.dateFrom) {
    chips.push({ key: "dateFrom", label: `${filterSheet.from} ${filters.dateFrom}` });
  }
  if (filters.dateTo) {
    chips.push({ key: "dateTo", label: `${filterSheet.to} ${filters.dateTo}` });
  }
  for (const id of filters.tagIds) {
    const tag = tags.find((row) => row.id === id);
    if (tag) chips.push({ key: `${TAG_CHIP}${id}`, label: tag.name });
  }
  return chips;
}

export default function ExpensesFilterChips({
  filters,
  destinations,
  tags,
  resultCount,
  onChange,
}: {
  filters: ExpensesFilters;
  destinations: DestinationOption[];
  tags: FinanceTag[];
  resultCount: number;
  onChange: (next: ExpensesFilters) => void;
}) {
  return (
    <FilterChipRow
      chips={chipsFor(filters, destinations, tags)}
      resultCount={resultCount}
      onRemove={(key) => onChange(withoutExpensesChip(filters, key))}
      onClear={() => onChange({ ...NO_EXPENSES_FILTERS, q: filters.q })}
    />
  );
}
