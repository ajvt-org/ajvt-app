"use client";

import { NO_FILTERS, activeFilterCount, type MemberFilters } from "@/lib/memberFilters";
import DateRangeFilter from "@/components/admin/filters/DateRangeFilter";
import FilterSheetShell, { FilterField } from "@/components/admin/filters/FilterSheetShell";
import MultiSelect from "@/components/admin/filters/MultiSelect";
import { filterSheet as texts, villageField, villagesDialog } from "@/lib/texts";
import { standingLabel } from "./FilterChips";
import OriginFilter from "./OriginFilter";
import { ageOptions, villageOptions } from "./filterOptions";
import type { AgeGroup, RecordingAdmin, Village } from "./types";

const STANDINGS = ["current", "former"];

export default function FilterSheet({
  filters,
  ageGroups,
  villages,
  paymentMethods,
  recordingAdmins,
  years,
  year,
  resultCount,
  onChange,
  onClose,
}: {
  filters: MemberFilters;
  ageGroups: AgeGroup[];
  villages: Village[];
  recordingAdmins: RecordingAdmin[];
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
        <MultiSelect
          label={texts.byVillage}
          allLabel={villagesDialog.filterAll}
          options={villageOptions(villages)}
          chosen={filters.village}
          onChange={(village) => onChange({ ...filters, village })}
        />
      </FilterField>

      <FilterField label={texts.age}>
        <MultiSelect
          label={texts.byAge}
          allLabel={texts.allAges}
          options={ageOptions(ageGroups)}
          chosen={filters.age}
          onChange={(age) => onChange({ ...filters, age })}
        />
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
        <OriginFilter filters={filters} recordingAdmins={recordingAdmins} onChange={onChange} />
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
