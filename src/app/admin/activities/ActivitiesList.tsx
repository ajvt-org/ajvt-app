"use client";

import IconLabel from "@/components/IconLabel";
import ActivityRow, { type RowControls } from "./ActivityRow";
import { sortActivities } from "@/lib/activityOrder";
import { activityRow as texts } from "@/lib/texts";
import type { Activity } from "./activityTypes";

function Empty({ nothingYet, onAdd }: { nothingYet: boolean; onAdd: () => void }) {
  return (
    <div className="card p-6 text-center space-y-3">
      <p className="text-sm" style={{ color: "var(--text-muted)" }}>
        {nothingYet ? texts.emptyList : texts.emptySearch}
      </p>
      {nothingYet && (
        <button onClick={onAdd} className="btn btn-sm btn-primary mx-auto">
          <IconLabel name="plus">{texts.addFirst}</IconLabel>
        </button>
      )}
    </div>
  );
}

export default function ActivitiesList({
  rows,
  total,
  controls,
  selecting,
  picked,
  onPick,
  onAdd,
}: {
  rows: Activity[];
  total: number;
  controls: RowControls;
  selecting: boolean;
  picked: Set<string>;
  onPick: (id: string) => void;
  onAdd: () => void;
}) {
  if (rows.length === 0) return <Empty nothingYet={total === 0} onAdd={onAdd} />;

  return (
    <div className="space-y-2">
      {sortActivities(rows).map((activity) => (
        <ActivityRow
          key={activity.id}
          activity={activity}
          controls={controls}
          selecting={selecting}
          picked={picked.has(activity.id)}
          onPick={onPick}
        />
      ))}
    </div>
  );
}
