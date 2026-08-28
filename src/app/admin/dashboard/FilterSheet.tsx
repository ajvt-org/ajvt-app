"use client";

import DialogHeader from "@/components/DialogHeader";
import IconLabel from "@/components/IconLabel";
import { counted } from "@/lib/arabicCount";
import { RESULT } from "@/lib/messages";
import { NO_FILTERS, activeFilterCount, type MemberFilters } from "@/lib/memberFilters";
import { OTHER_VILLAGE } from "@/lib/villages";
import DateRangeFilter from "./DateRangeFilter";
import { standingLabel } from "./FilterChips";
import { villageField, villagesDialog } from "@/lib/texts";
import type { AgeGroup, Village } from "./types";

const STANDINGS = ["current", "former"];

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-bold" style={{ color: "var(--text-muted)" }}>
        {label}
      </p>
      {children}
    </div>
  );
}

export default function FilterSheet({
  filters,
  ageGroups,
  villages,
  paymentMethods,
  years,
  year,
  resultCount,
  onChange,
  onClose,
}: {
  filters: MemberFilters;
  ageGroups: AgeGroup[];
  villages: Village[];
  paymentMethods: string[];
  years: number[];
  year: number;
  resultCount: number;
  onChange: (next: MemberFilters) => void;
  onClose: () => void;
}) {
  const active = activeFilterCount(filters);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center"
      style={{ background: "rgba(10,30,20,0.6)", backdropFilter: "blur(4px)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-md rounded-t-3xl md:rounded-2xl overflow-y-auto"
        style={{ background: "var(--mint-50)", maxHeight: "92svh", direction: "rtl" }}
      >
        <DialogHeader title="تصفية القائمة" onClose={onClose} />

        <div className="p-5 space-y-4">
          <Field label={villageField.label}>
            <select
              value={filters.village}
              onChange={(e) => onChange({ ...filters, village: e.target.value })}
              className="input input-sm w-full"
              aria-label="تصفية حسب القرية"
            >
              <option value="">{villagesDialog.filterAll}</option>
              {villages.map((v) => (
                <option key={v.id} value={v.name}>
                  {v.name}
                </option>
              ))}
              <option value={OTHER_VILLAGE}>{OTHER_VILLAGE}</option>
            </select>
          </Field>

          <Field label="العصر">
            <select
              value={filters.age}
              onChange={(e) => onChange({ ...filters, age: e.target.value })}
              className="input input-sm w-full"
              aria-label="تصفية حسب العصر"
            >
              <option value="">كل الأعصار</option>
              {ageGroups.map((g) => (
                <option key={g.id} value={g.name}>
                  {g.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="طريقة الدفع">
            <select
              value={filters.method}
              onChange={(e) => onChange({ ...filters, method: e.target.value })}
              className="input input-sm w-full"
              aria-label="تصفية حسب طريقة الدفع"
            >
              <option value="">كل طرق الدفع</option>
              {paymentMethods.map((method) => (
                <option key={method} value={method}>
                  {method}
                </option>
              ))}
            </select>
          </Field>

          <Field label="المبلغ المدفوع">
            <select
              value={filters.paid}
              onChange={(e) => onChange({ ...filters, paid: e.target.value })}
              className="input input-sm w-full"
              aria-label="تصفية حسب المبلغ المدفوع"
            >
              <option value="">كل المبالغ</option>
              <option value="full">دفع كامل</option>
              <option value="partial">دفع ناقص</option>
              <option value="none">لم يدفع</option>
            </select>
          </Field>

          {years.length > 1 && (
            <Field label="سنة العضوية">
              <select
                value={filters.year}
                onChange={(e) => onChange({ ...filters, year: e.target.value })}
                className="input input-sm w-full"
                aria-label="تصفية حسب سنة العضوية"
              >
                <option value="">كل السنوات</option>
                {years.map((year) => (
                  <option key={year} value={String(year)}>
                    عضوية {year}
                  </option>
                ))}
              </select>
            </Field>
          )}

          <Field label="تاريخ الطلب">
            <DateRangeFilter
              from={filters.from}
              to={filters.to}
              onChange={(range) => onChange({ ...filters, ...range })}
            />
          </Field>

          <Field label={`عضوية ${year}`}>
            <div className="flex gap-2">
              {STANDINGS.map((value) => {
                const on = filters.standing === value;
                return (
                  <button
                    key={value}
                    onClick={() => onChange({ ...filters, standing: on ? "" : value })}
                    className="text-xs px-3 py-1.5 rounded-lg font-bold"
                    style={{
                      background: on ? "var(--mint-600)" : "white",
                      color: on ? "white" : "var(--mint-700)",
                      border: on ? "none" : "1px solid var(--mint-100)",
                    }}
                  >
                    {standingLabel(value, year)}
                  </button>
                );
              })}
            </div>
          </Field>

          <div className="flex items-center gap-2 pt-1">
            <span className="text-xs flex-1" style={{ color: "var(--text-muted)" }}>
              {counted(resultCount, RESULT)}
            </span>
            {active > 0 && (
              <button
                onClick={() => onChange({ ...NO_FILTERS, status: filters.status, q: filters.q })}
                className="btn btn-sm text-xs"
                style={{
                  background: "white",
                  color: "var(--mint-700)",
                  border: "1px solid var(--mint-100)",
                }}
              >
                <IconLabel name="close">إزالة التصفية</IconLabel>
              </button>
            )}
            <button onClick={onClose} className="btn btn-primary btn-sm text-xs">
              تم
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
