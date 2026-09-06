"use client";

import HalfPoints from "@/components/HalfPoints";
import Icon from "@/components/Icon";
import { seriesResult as texts } from "@/lib/texts";
import type { PartRow, RecordedAdjustmentRow, SeriesStandingRow } from "./seriesTypes";

export function partMark(part: PartRow): { text: string; dim: boolean } {
  if (part.abandoned) return { text: "—", dim: true };
  if (part.outcome === "SIDE_A") return { text: "1", dim: false };
  if (part.outcome === "SIDE_B") return { text: "0", dim: false };
  if (part.outcome === "DRAW") return { text: "½", dim: false };
  if (part.sideAPoints === null || part.sideBPoints === null) return { text: "—", dim: true };
  return { text: `${part.sideAPoints}-${part.sideBPoints}`, dim: false };
}

export default function SeriesScoreline({
  parts,
  standing,
  partWord,
  adjustments = [],
  sides = [],
}: {
  parts: PartRow[];
  standing: SeriesStandingRow;
  partWord: string;
  adjustments?: RecordedAdjustmentRow[];
  sides?: string[];
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
      <span className="text-base font-black tabular-nums" style={{ color: "var(--text-main)" }}>
        <HalfPoints halves={standing.sideAHalves} />
        {" — "}
        <HalfPoints halves={standing.sideBHalves} />
      </span>
      {!standing.over && (
        <span className="badge badge-pending">
          {standing.extending ? texts.extending : texts.inProgress}
        </span>
      )}
      {parts.length > 0 && (
        <span className="flex items-center gap-1 flex-wrap">
          {parts.map((part) => {
            const mark = partMark(part);
            return (
              <span
                key={part.id}
                title={`${partWord} ${part.order}`}
                className="text-xs font-bold rounded px-1.5 py-0.5"
                style={{
                  background: "var(--mint-50)",
                  color: mark.dim ? "var(--text-muted)" : "var(--mint-700)",
                }}
              >
                <bdi dir="ltr">{mark.text}</bdi>
              </span>
            );
          })}
        </span>
      )}
      {adjustments.length > 0 && (
        <span className="text-xs" style={{ color: "var(--copper-600)" }}>
          <Icon name="swords" size={12} className="icon-inline" />{" "}
          {adjustments
            .map((row) => texts.moveOf(row.rule.name, row.side === "SIDE_A" ? sides[0] : sides[1]))
            .join(texts.movesSeparator)}
        </span>
      )}
      {standing.over && standing.level && (
        <span className="text-xs" style={{ color: "var(--text-muted)" }}>
          <Icon name="handshake" size={12} className="icon-inline" /> {texts.level}
        </span>
      )}
    </div>
  );
}
