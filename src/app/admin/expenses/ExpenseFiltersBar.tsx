"use client";

import type { ActivityOption } from "./types";
import type { ExpensesFilters } from "./expensesFilters";

export default function ExpenseFiltersBar({
  filters,
  activities,
  isFiltered,
  onChange,
  onReset,
}: {
  filters: ExpensesFilters;
  activities: ActivityOption[];
  isFiltered: boolean;
  onChange: (next: ExpensesFilters) => void;
  onReset: () => void;
}) {
  return (
    <div className="flex items-center gap-2 flex-wrap">
      <select
        value={filters.activityId}
        onChange={(e) => onChange({ ...filters, activityId: e.target.value })}
        className="input text-sm flex-1 min-w-[140px]"
      >
        <option value="">كل الأنشطة</option>
        {activities.map((a) => (
          <option key={a.id} value={a.id}>
            {a.title}
          </option>
        ))}
      </select>
      <label
        className="text-xs shrink-0"
        style={{ color: "var(--text-muted)" }}
        htmlFor="expense-date-from"
      >
        من
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
        إلى
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
          إعادة تصفير الكل
        </button>
      )}
    </div>
  );
}
