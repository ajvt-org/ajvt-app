"use client";

import DestinationSelect from "@/components/admin/DestinationSelect";
import FinanceTagChips, { type FinanceTag } from "@/components/admin/FinanceTagChips";
import AmountFilterInput from "@/components/admin/filters/AmountFilterInput";
import DateRangeFilter from "@/components/admin/filters/DateRangeFilter";
import FilterSheetShell, { FilterField } from "@/components/admin/filters/FilterSheetShell";
import { amountFilter, destinationPicker, expensesPage as texts } from "@/lib/texts";
import type { DestinationOption } from "@/lib/moneyDestination";
import {
  NO_EXPENSES_FILTERS,
  activeExpensesFilterCount,
  type ExpensesFilters,
} from "./expensesFilters";

export default function ExpensesFilterSheet({
  filters,
  destinations,
  tags,
  resultCount,
  onChange,
  onClose,
}: {
  filters: ExpensesFilters;
  destinations: DestinationOption[];
  tags: FinanceTag[];
  resultCount: number;
  onChange: (next: ExpensesFilters) => void;
  onClose: () => void;
}) {
  return (
    <FilterSheetShell
      activeCount={activeExpensesFilterCount(filters)}
      resultCount={resultCount}
      onClear={() => onChange({ ...NO_EXPENSES_FILTERS, q: filters.q })}
      onClose={onClose}
    >
      <FilterField label={texts.destination}>
        <DestinationSelect
          destinations={destinations}
          value={filters.destinationId}
          onChange={(destinationId) => onChange({ ...filters, destinationId })}
          emptyLabel={destinationPicker.anyDestination}
          className="input input-sm w-full"
        />
      </FilterField>

      <FilterField label={texts.expenseDate}>
        <DateRangeFilter
          from={filters.dateFrom}
          to={filters.dateTo}
          idPrefix="expenses"
          onChange={(range) => onChange({ ...filters, dateFrom: range.from, dateTo: range.to })}
        />
      </FilterField>

      <FilterField label={amountFilter.title}>
        <AmountFilterInput
          value={filters.amount}
          onChange={(amount) => onChange({ ...filters, amount })}
        />
      </FilterField>

      {tags.length > 0 && (
        <FilterField label={texts.tags}>
          <FinanceTagChips
            tags={tags}
            selected={filters.tagIds}
            onToggle={(id) =>
              onChange({
                ...filters,
                tagIds: filters.tagIds.includes(id)
                  ? filters.tagIds.filter((kept) => kept !== id)
                  : [...filters.tagIds, id],
              })
            }
          />
        </FilterField>
      )}
    </FilterSheetShell>
  );
}
