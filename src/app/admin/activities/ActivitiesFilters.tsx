"use client";

import { useState } from "react";
import IconLabel from "@/components/IconLabel";
import ActivitiesFilterSheet from "./ActivitiesFilterSheet";
import { activeFilterCount, type ActivitiesView } from "./activitiesView";
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
  const [open, setOpen] = useState(false);
  const active = activeFilterCount(filters);

  return (
    <div className="card p-2.5">
      <div className="flex items-center gap-2">
        <input
          type="text"
          placeholder={texts.searchPlaceholder}
          value={filters.q}
          onChange={(e) => onChange({ ...filters, q: e.target.value })}
          className="input input-sm flex-1 min-w-0"
          style={{ background: "white" }}
        />
        {activities.length > 0 && (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="text-xs font-bold px-2.5 py-2 rounded-lg shrink-0 relative"
            style={{
              background: "var(--mint-50)",
              color: "var(--mint-700)",
              border: "1px solid var(--mint-100)",
            }}
          >
            <IconLabel name="filter">{texts.filters.heading}</IconLabel>
            {active > 0 && (
              <span
                dir="ltr"
                className="absolute -top-1.5 -start-1.5 rounded-full text-white font-black flex items-center justify-center"
                style={{
                  background: "var(--mint-600)",
                  fontSize: "9px",
                  minWidth: "16px",
                  height: "16px",
                }}
              >
                {active}
              </span>
            )}
          </button>
        )}
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

      {open && (
        <ActivitiesFilterSheet
          activities={activities}
          filters={filters}
          onChange={onChange}
          onClose={() => setOpen(false)}
        />
      )}
    </div>
  );
}
