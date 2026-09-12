"use client";

import {
  ADMIN_ORIGIN,
  SELF_ORIGIN,
  NO_FILTERS,
  activeFilterCount,
  type MemberFilters,
} from "@/lib/memberFilters";
import { OTHER_VILLAGE } from "@/lib/villages";
import DateRangeFilter from "@/components/admin/filters/DateRangeFilter";
import FilterSheetShell, { FilterField } from "@/components/admin/filters/FilterSheetShell";
import { standingLabel } from "./FilterChips";
import { villageField, villagesDialog } from "@/lib/texts";
import type { AgeGroup, Village } from "./types";
import { filterSheet as texts } from "@/lib/texts";

const STANDINGS = ["current", "former"];

const NARROWINGS = [
  { key: "nophone", label: texts.noPhone },
  { key: "nocapture", label: texts.noCapture },
] as const;

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
  return (
    <FilterSheetShell
      activeCount={activeFilterCount(filters)}
      resultCount={resultCount}
      onClear={() => onChange({ ...NO_FILTERS, status: filters.status, q: filters.q })}
      onClose={onClose}
    >
      <FilterField label={villageField.label}>
        <select
          value={filters.village}
          onChange={(e) => onChange({ ...filters, village: e.target.value })}
          className="input input-sm w-full"
          aria-label={texts.byVillage}
        >
          <option value="">{villagesDialog.filterAll}</option>
          {villages.map((v) => (
            <option key={v.id} value={v.name}>
              {v.name}
            </option>
          ))}
          <option value={OTHER_VILLAGE}>{OTHER_VILLAGE}</option>
        </select>
      </FilterField>

      <FilterField label={texts.age}>
        <select
          value={filters.age}
          onChange={(e) => onChange({ ...filters, age: e.target.value })}
          className="input input-sm w-full"
          aria-label={texts.byAge}
        >
          <option value="">{texts.allAges}</option>
          {ageGroups.map((g) => (
            <option key={g.id} value={g.name}>
              {g.name}
            </option>
          ))}
        </select>
      </FilterField>

      <FilterField label={texts.method}>
        <select
          value={filters.method}
          onChange={(e) => onChange({ ...filters, method: e.target.value })}
          className="input input-sm w-full"
          aria-label={texts.byMethod}
        >
          <option value="">{texts.allMethods}</option>
          {paymentMethods.map((method) => (
            <option key={method} value={method}>
              {method}
            </option>
          ))}
        </select>
      </FilterField>

      <FilterField label={texts.paid}>
        <select
          value={filters.paid}
          onChange={(e) => onChange({ ...filters, paid: e.target.value })}
          className="input input-sm w-full"
          aria-label={texts.byPaid}
        >
          <option value="">{texts.allAmounts}</option>
          <option value="full">{texts.paidFull}</option>
          <option value="partial">{texts.paidPartial}</option>
          <option value="none">{texts.paidNone}</option>
        </select>
      </FilterField>

      {years.length > 1 && (
        <FilterField label={texts.membershipYear}>
          <select
            value={filters.year}
            onChange={(e) => onChange({ ...filters, year: e.target.value })}
            className="input input-sm w-full"
            aria-label={texts.byYear}
          >
            <option value="">{texts.allYears}</option>
            {years.map((year) => (
              <option key={year} value={String(year)}>
                {texts.yearOption(year)}
              </option>
            ))}
          </select>
        </FilterField>
      )}

      <FilterField label={texts.requestDate}>
        <DateRangeFilter
          from={filters.from}
          to={filters.to}
          idPrefix="members"
          onChange={(range) => onChange({ ...filters, ...range })}
        />
      </FilterField>

      <FilterField label={texts.origin}>
        <select
          value={filters.origin}
          onChange={(e) =>
            onChange(
              e.target.value === ADMIN_ORIGIN
                ? { ...filters, origin: ADMIN_ORIGIN }
                : { ...filters, origin: e.target.value, nophone: "", nocapture: "" },
            )
          }
          className="input input-sm w-full"
          aria-label={texts.byOrigin}
        >
          <option value="">{texts.allOrigins}</option>
          <option value={ADMIN_ORIGIN}>{texts.originAdmin}</option>
          <option value={SELF_ORIGIN}>{texts.originSelf}</option>
        </select>

        {filters.origin === ADMIN_ORIGIN && (
          <div className="flex flex-wrap gap-2 mt-2">
            {NARROWINGS.map(({ key, label }) => {
              const on = !!filters[key];
              return (
                <button
                  key={key}
                  onClick={() => onChange({ ...filters, [key]: on ? "" : "yes" })}
                  className="text-xs px-3 py-1.5 rounded-lg font-bold"
                  style={{
                    background: on ? "var(--mint-600)" : "white",
                    color: on ? "white" : "var(--mint-700)",
                    border: on ? "none" : "1px solid var(--mint-100)",
                  }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        )}
      </FilterField>

      <FilterField label={texts.membershipOf(year)}>
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
      </FilterField>
    </FilterSheetShell>
  );
}
