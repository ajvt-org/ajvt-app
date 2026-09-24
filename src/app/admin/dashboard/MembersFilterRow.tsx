"use client";

import DateRangeFilter from "@/components/admin/filters/DateRangeFilter";
import FilterRow from "@/components/admin/filters/FilterRow";
import MultiSelect from "@/components/admin/filters/MultiSelect";
import type { MemberFilters } from "@/lib/memberFilters";
import { MEMBER_SORTS, readMemberSort } from "@/lib/memberSort";
import { MEMBER_SORT_LABEL, filterSheet as texts, villagesDialog } from "@/lib/texts";
import { ageOptions, villageOptions } from "./filterOptions";
import type { AgeGroup, Village } from "./types";

export default function MembersFilterRow({
  filters,
  villages,
  ageGroups,
  paymentMethods,
  onChange,
}: {
  filters: MemberFilters;
  villages: Village[];
  ageGroups: AgeGroup[];
  paymentMethods: string[];
  onChange: (next: MemberFilters) => void;
}) {
  return (
    <FilterRow
      pickers={[
        <MultiSelect
          key="village"
          label={texts.byVillage}
          allLabel={villagesDialog.filterAll}
          options={villageOptions(villages)}
          chosen={filters.village}
          onChange={(village) => onChange({ ...filters, village })}
        />,
        <MultiSelect
          key="age"
          label={texts.byAge}
          allLabel={texts.allAges}
          options={ageOptions(ageGroups)}
          chosen={filters.age}
          onChange={(age) => onChange({ ...filters, age })}
        />,
        <select
          key="method"
          value={filters.method}
          onChange={(e) => onChange({ ...filters, method: e.target.value })}
          className="input input-sm w-full"
          aria-label={texts.byMethod}
        >
          <option value="">{texts.anyMethod}</option>
          {paymentMethods.map((method) => (
            <option key={method} value={method}>
              {method}
            </option>
          ))}
        </select>,
      ]}
    >
      <DateRangeFilter
        from={filters.from}
        to={filters.to}
        idPrefix="members-row"
        onChange={(range) => onChange({ ...filters, ...range })}
      />
      <select
        value={filters.sort}
        onChange={(e) => onChange({ ...filters, sort: readMemberSort(e.target.value) })}
        className="input input-sm w-full"
        aria-label={texts.sortBy}
      >
        {MEMBER_SORTS.map((sort) => (
          <option key={sort} value={sort}>
            {MEMBER_SORT_LABEL[sort]}
          </option>
        ))}
      </select>
    </FilterRow>
  );
}
