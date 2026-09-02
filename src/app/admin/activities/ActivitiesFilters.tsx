"use client";

import FilterChips from "./FilterChips";
import { ACTIVITY_STATES, ACTIVITY_TYPES, type ActivitiesView } from "./activitiesView";
import { activityRow as texts } from "@/lib/texts";

export default function ActivitiesFilters({
  filters,
  onChange,
}: {
  filters: ActivitiesView;
  onChange: (next: ActivitiesView) => void;
}) {
  return (
    <div className="space-y-1.5">
      <input
        type="text"
        placeholder={texts.searchPlaceholder}
        value={filters.q}
        onChange={(e) => onChange({ ...filters, q: e.target.value })}
        className="input input-sm w-full"
        style={{ background: "white" }}
      />
      <FilterChips
        options={ACTIVITY_TYPES}
        value={filters.type}
        onPick={(type) => onChange({ ...filters, type })}
        label={texts.filters.anyType}
      />
      <FilterChips
        options={ACTIVITY_STATES}
        value={filters.state}
        onPick={(state) => onChange({ ...filters, state })}
        label={texts.filters.anyState}
      />
    </div>
  );
}
