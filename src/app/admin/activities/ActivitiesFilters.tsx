"use client";

import FilterAxisRow from "./FilterAxisRow";
import { countForOption, FILTER_AXES, type ActivitiesView } from "./activitiesView";
import { activityRow as texts } from "@/lib/texts";
import type { Activity } from "./activityTypes";

export default function ActivitiesFilters({
  activities,
  filters,
  onChange,
}: {
  activities: Activity[];
  filters: ActivitiesView;
  onChange: (next: ActivitiesView) => void;
}) {
  return (
    <div className="card p-2.5 space-y-2">
      <input
        type="text"
        placeholder={texts.searchPlaceholder}
        value={filters.q}
        onChange={(e) => onChange({ ...filters, q: e.target.value })}
        className="input input-sm w-full"
        style={{ background: "white" }}
      />
      {FILTER_AXES.map((axis) => (
        <FilterAxisRow
          key={axis.key}
          axis={axis}
          value={filters[axis.key]}
          countOf={(value) => countForOption(activities, filters, axis.key, value)}
          onPick={(value) => onChange({ ...filters, [axis.key]: value })}
        />
      ))}
    </div>
  );
}
