"use client";

import DialogHeader from "@/components/DialogHeader";
import IconLabel from "@/components/IconLabel";
import FilterAxisRow from "./FilterAxisRow";
import {
  activeFilterCount,
  axisViews,
  clearedActivitiesView,
  type ActivitiesView,
} from "./activitiesView";
import { activityRow as texts } from "@/lib/texts";
import type { Activity } from "./activityTypes";

export default function ActivitiesFilterSheet({
  activities,
  filters,
  onChange,
  onClose,
}: {
  activities: Activity[];
  filters: ActivitiesView;
  onChange: (next: ActivitiesView) => void;
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
        <DialogHeader title={texts.filters.sheetTitle} onClose={onClose} />

        <div className="p-5 space-y-3">
          {axisViews(activities, filters).map((axis) => (
            <FilterAxisRow
              key={axis.key}
              axis={axis}
              onPick={(value) => onChange({ ...filters, [axis.key]: value })}
            />
          ))}

          <div className="flex items-center justify-end gap-2 pt-1">
            {active > 0 && (
              <button
                onClick={() => onChange(clearedActivitiesView(filters))}
                className="btn btn-sm"
                style={{
                  background: "white",
                  color: "var(--mint-700)",
                  border: "1px solid var(--mint-100)",
                }}
              >
                <IconLabel name="close">{texts.filters.clear}</IconLabel>
              </button>
            )}
            <button onClick={onClose} className="btn btn-primary btn-sm">
              {texts.filters.done}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
