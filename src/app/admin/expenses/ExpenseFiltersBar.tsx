"use client";

import DestinationSelect from "@/components/admin/DestinationSelect";
import { destinationPicker, expensesPage } from "@/lib/texts";
import type { DestinationOption } from "@/lib/moneyDestination";
import type { ExpensesFilters } from "./expensesFilters";

export default function ExpenseFiltersBar({
  filters,
  destinations,
  isFiltered,
  onChange,
  onReset,
}: {
  filters: ExpensesFilters;
  destinations: DestinationOption[];
  isFiltered: boolean;
  onChange: (next: ExpensesFilters) => void;
  onReset: () => void;
}) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <DestinationSelect
        destinations={destinations}
        value={filters.destinationId}
        onChange={(destinationId) => onChange({ ...filters, destinationId })}
        emptyLabel={destinationPicker.anyDestination}
        className="input text-sm flex-1 min-w-[140px]"
      />
      <label
        className="text-xs shrink-0"
        style={{ color: "var(--text-muted)" }}
        htmlFor="expense-date-from"
      >
        {expensesPage.from}
      </label>
      <input
        id="expense-date-from"
        type="date"
        value={filters.dateFrom}
        onChange={(e) => onChange({ ...filters, dateFrom: e.target.value })}
        className="input text-sm flex-1 min-w-0"
      />
      <label
        className="text-xs shrink-0"
        style={{ color: "var(--text-muted)" }}
        htmlFor="expense-date-to"
      >
        {expensesPage.to}
      </label>
      <input
        id="expense-date-to"
        type="date"
        value={filters.dateTo}
        min={filters.dateFrom || undefined}
        onChange={(e) => onChange({ ...filters, dateTo: e.target.value })}
        className="input text-sm flex-1 min-w-0"
      />
      {isFiltered && (
        <button
          onClick={onReset}
          className="text-xs font-bold shrink-0"
          style={{ color: "var(--mint-700)" }}
        >
          {expensesPage.resetFilters}
        </button>
      )}
    </div>
  );
}
