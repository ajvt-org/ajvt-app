"use client";

import IconLabel from "@/components/IconLabel";
import FilterAxisRow from "./FilterAxisRow";
import { countForOption, FILTER_AXES, type ActivitiesView } from "./activitiesView";
import { activityRow as texts } from "@/lib/texts";
import type { Activity } from "./activityTypes";

export default function ActivitiesFilters({
  activities,
  filters,
  selecting,
  onChange,
  onSelectingChange,
}: {
  activities: Activity[];
  filters: ActivitiesView;
  selecting: boolean;
  onChange: (next: ActivitiesView) => void;
  onSelectingChange: (selecting: boolean) => void;
}) {
  return (
    <div className="card p-2.5 space-y-2">
      <div className="flex items-center gap-2">
        <input
          type="text"
          placeholder={texts.searchPlaceholder}
          value={filters.q}
          onChange={(e) => onChange({ ...filters, q: e.target.value })}
          className="input input-sm flex-1 min-w-0"
          style={{ background: "white" }}
        />
        <button
          type="button"
          onClick={() => onSelectingChange(!selecting)}
          aria-pressed={selecting}
          className="text-xs font-bold px-2.5 py-2 rounded-lg shrink-0"
          style={{
            background: selecting ? "var(--mint-600)" : "var(--mint-50)",
            color: selecting ? "white" : "var(--mint-700)",
            border: selecting ? "none" : "1px solid var(--mint-100)",
          }}
        >
          <IconLabel name="check">{texts.selectMode}</IconLabel>
        </button>
      </div>
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
