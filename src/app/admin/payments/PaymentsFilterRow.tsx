"use client";

import AmountFilterInput from "@/components/admin/filters/AmountFilterInput";
import DateRangeFilter from "@/components/admin/filters/DateRangeFilter";
import FilterRow from "@/components/admin/filters/FilterRow";
import type { PaymentsFilters } from "./paymentsFilters";

export default function PaymentsFilterRow({
  filters,
  onChange,
}: {
  filters: PaymentsFilters;
  onChange: (next: PaymentsFilters) => void;
}) {
  return (
    <FilterRow>
      <DateRangeFilter
        from={filters.from}
        to={filters.to}
        idPrefix="payments-row"
        onChange={(range) => onChange({ ...filters, focus: "", ...range })}
      />
      <AmountFilterInput
        value={filters.amount}
        onChange={(amount) => onChange({ ...filters, focus: "", amount })}
      />
    </FilterRow>
  );
}
