"use client";

import IconLabel from "@/components/IconLabel";
import { formatDateTime } from "@/lib/clubTime";
import { endsAt } from "@/lib/election";
import { electionAdmin as texts } from "@/lib/texts";
import ElectionStateChip from "./ElectionStateChip";
import type { ElectionRow } from "./electionTypes";

function Span({ label, at }: { label: string; at: string | Date }) {
  return (
    <span>
      {label} <bdi dir="ltr">{formatDateTime(at)}</bdi>
    </span>
  );
}

export default function ElectionList({
  rows,
  selectedId,
  onSelect,
  onCreate,
}: {
  rows: ElectionRow[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onCreate: () => void;
}) {
  return (
    <div className="card p-4 space-y-3">
      <div className="flex justify-end">
        <button onClick={onCreate} className="btn btn-primary btn-sm">
          <IconLabel name="plus">{texts.newElection}</IconLabel>
        </button>
      </div>

      {rows.length === 0 && (
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          {texts.empty}
        </p>
      )}

      <div className="space-y-1.5">
        {rows.map((row) => {
          const active = row.id === selectedId;
          return (
            <button
              key={row.id}
              onClick={() => onSelect(row.id)}
              className="w-full text-start rounded-lg p-2.5 space-y-1"
              style={{
                background: active ? "var(--mint-100)" : "var(--surface-2)",
                border: `1px solid ${active ? "var(--mint-500)" : "transparent"}`,
              }}
            >
              <div className="flex items-start gap-2 flex-wrap">
                <span
                  className="text-sm font-bold"
                  style={{ color: "var(--text-main)", overflowWrap: "anywhere" }}
                >
                  {row.title}
                </span>
                <ElectionStateChip election={row} />
              </div>
              <p className="text-xs flex flex-wrap gap-x-3" style={{ color: "var(--text-muted)" }}>
                <Span label={texts.from} at={row.startsAt} />
                <Span label={texts.to} at={endsAt(row)} />
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
