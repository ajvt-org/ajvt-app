"use client";

import DestinationSelect from "@/components/admin/DestinationSelect";
import type { FinanceTag } from "@/components/admin/FinanceTagChips";
import AmountFilterInput from "@/components/admin/filters/AmountFilterInput";
import DateRangeFilter from "@/components/admin/filters/DateRangeFilter";
import FilterRow from "@/components/admin/filters/FilterRow";
import MultiSelect from "@/components/admin/filters/MultiSelect";
import type { DestinationOption } from "@/lib/moneyDestination";
import { destinationPicker, expensesPage as texts } from "@/lib/texts";
import type { ExpensesFilters } from "./expensesFilters";

export default function ExpensesFilterRow({
  filters,
  destinations,
  tags,
  onChange,
}: {
  filters: ExpensesFilters;
  destinations: DestinationOption[];
  tags: FinanceTag[];
  onChange: (next: ExpensesFilters) => void;
}) {
  return (
    <FilterRow
      pickers={[
        <label key="destination" className="min-w-0">
          <span className="sr-only">{texts.byDestination}</span>
          <DestinationSelect
            destinations={destinations}
            value={filters.destinationId}
            onChange={(destinationId) => onChange({ ...filters, destinationId })}
            emptyLabel={destinationPicker.anyDestination}
            className="input input-sm w-full"
          />
        </label>,
        <MultiSelect
          key="tags"
          label={texts.byTags}
          allLabel={texts.allTags}
          options={tags.map((tag) => ({ value: tag.id, label: tag.name }))}
          chosen={filters.tagIds}
          onChange={(tagIds) => onChange({ ...filters, tagIds })}
        />,
      ]}
    >
      <DateRangeFilter
        from={filters.dateFrom}
        to={filters.dateTo}
        idPrefix="expenses-row"
        onChange={(range) => onChange({ ...filters, dateFrom: range.from, dateTo: range.to })}
      />
      <AmountFilterInput
        value={filters.amount}
        onChange={(amount) => onChange({ ...filters, amount })}
      />
    </FilterRow>
  );
}
