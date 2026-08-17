"use client";

import IconLabel from "@/components/IconLabel";
import { counted } from "@/lib/arabicCount";
import { RESULT } from "@/lib/messages";
import { NO_FILTERS, activeFilterCount, type MemberFilters } from "@/lib/memberFilters";
import DateRangeFilter from "./DateRangeFilter";
import type { AgeGroup } from "./types";

const STANDING_LABEL: Record<string, string> = {
  paid: "مسدّدون",
  behind: "متأخرون",
};

const SELECT = "input text-xs";
const SELECT_STYLE = { width: "auto" };

export default function MemberFilterRow({
  filters,
  ageGroups,
  paymentMethods,
  years,
  resultCount,
  onChange,
}: {
  filters: MemberFilters;
  ageGroups: AgeGroup[];
  paymentMethods: string[];
  years: number[];
  resultCount: number;
  onChange: (next: MemberFilters) => void;
}) {
  const cleared = activeFilterCount(filters);

  return (
    <div className="flex items-center gap-2 mb-3 flex-wrap">
      <select
        value={filters.age}
        onChange={(e) => onChange({ ...filters, age: e.target.value })}
        className={SELECT}
        style={SELECT_STYLE}
        aria-label="تصفية حسب العصر"
      >
        <option value="">كل الأعصار</option>
        {ageGroups.map((g) => (
          <option key={g.id} value={g.name}>
            {g.name}
          </option>
        ))}
      </select>

      <select
        value={filters.method}
        onChange={(e) => onChange({ ...filters, method: e.target.value })}
        className={SELECT}
        style={SELECT_STYLE}
        aria-label="تصفية حسب طريقة الدفع"
      >
        <option value="">كل طرق الدفع</option>
        {paymentMethods.map((method) => (
          <option key={method} value={method}>
            {method}
          </option>
        ))}
      </select>

      <select
        value={filters.paid}
        onChange={(e) => onChange({ ...filters, paid: e.target.value })}
        className={SELECT}
        style={SELECT_STYLE}
        aria-label="تصفية حسب المبلغ المدفوع"
      >
        <option value="">كل المبالغ</option>
        <option value="full">دفع كامل</option>
        <option value="partial">دفع ناقص</option>
        <option value="none">لم يدفع</option>
      </select>

      {years.length > 1 && (
        <select
          value={filters.year}
          onChange={(e) => onChange({ ...filters, year: e.target.value })}
          className={SELECT}
          style={SELECT_STYLE}
          aria-label="تصفية حسب سنة العضوية"
        >
          <option value="">كل السنوات</option>
          {years.map((year) => (
            <option key={year} value={String(year)}>
              عضوية {year}
            </option>
          ))}
        </select>
      )}

      <DateRangeFilter
        from={filters.from}
        to={filters.to}
        onChange={(range) => onChange({ ...filters, ...range })}
      />

      {filters.standing && STANDING_LABEL[filters.standing] && (
        <button
          onClick={() => onChange({ ...filters, standing: "" })}
          className="text-xs px-2.5 py-1 rounded-lg font-bold"
          style={{ background: "var(--mint-600)", color: "white" }}
        >
          <IconLabel name="close">{STANDING_LABEL[filters.standing]}</IconLabel>
        </button>
      )}

      <span className="text-xs" style={{ color: "var(--text-muted)" }}>
        {counted(resultCount, RESULT)}
      </span>

      {cleared > 0 && (
        <button
          onClick={() => onChange(NO_FILTERS)}
          className="text-xs font-bold"
          style={{ color: "var(--mint-700)" }}
        >
          <IconLabel name="close">إزالة التصفية ({cleared})</IconLabel>
        </button>
      )}
    </div>
  );
}
