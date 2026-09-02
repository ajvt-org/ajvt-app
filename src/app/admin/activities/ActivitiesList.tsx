"use client";

import { useState } from "react";
import Icon from "@/components/Icon";
import IconLabel from "@/components/IconLabel";
import ActivityRow, { type RowControls } from "./ActivityRow";
import { splitByStage } from "./activitiesList";
import { activityRow as texts } from "@/lib/texts";
import type { Activity } from "./activityTypes";

interface Picking {
  controls: RowControls;
  picked: Set<string>;
  onPick: (id: string) => void;
}

function Rows({ rows, controls, picked, onPick }: Picking & { rows: Activity[] }) {
  return (
    <div className="space-y-2">
      {rows.map((a) => (
        <ActivityRow
          key={a.id}
          activity={a}
          controls={controls}
          picked={picked.has(a.id)}
          onPick={onPick}
        />
      ))}
    </div>
  );
}

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
  picked,
  onPick,
  onAdd,
}: Picking & {
  rows: Activity[];
  total: number;
  onAdd: () => void;
}) {
  const [showFinished, setShowFinished] = useState(false);

  if (rows.length === 0) return <Empty nothingYet={total === 0} onAdd={onAdd} />;

  const { current, finished } = splitByStage(rows);

  return (
    <div className="space-y-3">
      {current.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-bold" style={{ color: "var(--mint-700)" }}>
            {texts.sections.current}
          </p>
          <Rows rows={current} controls={controls} picked={picked} onPick={onPick} />
        </div>
      )}

      {finished.length > 0 && (
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => setShowFinished((shown) => !shown)}
            aria-expanded={showFinished}
            className="text-xs font-bold flex items-center gap-1"
            style={{ color: "var(--mint-700)" }}
          >
            <Icon name={showFinished ? "chevronUp" : "chevronDown"} size={13} />
            {texts.sections.finished(finished.length)}
          </button>
          {showFinished && (
            <Rows rows={finished} controls={controls} picked={picked} onPick={onPick} />
          )}
        </div>
      )}
    </div>
  );
}
