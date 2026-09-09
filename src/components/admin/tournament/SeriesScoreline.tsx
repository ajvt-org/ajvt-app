"use client";

import HalfPoints from "@/components/HalfPoints";
import Icon from "@/components/Icon";
import { seriesResult as texts } from "@/lib/texts";
import type { RecordedMoveRow, SeriesStandingRow, UnitRow } from "./seriesTypes";

export function unitMark(unit: UnitRow): { text: string; dim: boolean } {
  if (unit.abandoned) return { text: "—", dim: true };
  if (unit.standing) {
    if (unit.standing.winner === "SIDE_A") return { text: "1", dim: false };
    if (unit.standing.winner === "SIDE_B") return { text: "0", dim: false };
    return { text: `${unit.standing.sideATotal}-${unit.standing.sideBTotal}`, dim: false };
  }
  if (unit.outcome === "SIDE_A") return { text: "1", dim: false };
  if (unit.outcome === "SIDE_B") return { text: "0", dim: false };
  if (unit.outcome === "DRAW") return { text: "½", dim: false };
  if (unit.sideAPoints === null || unit.sideBPoints === null) return { text: "—", dim: true };
  return { text: `${unit.sideAPoints}-${unit.sideBPoints}`, dim: false };
}

export default function SeriesScoreline({
  units,
  standing,
  unitWord,
  extension = null,
  moves = [],
  sides = [],
}: {
  units: UnitRow[];
  standing: SeriesStandingRow;
  unitWord: string;
  extension?: string | null;
  moves?: RecordedMoveRow[];
  sides?: string[];
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
      <span className="text-base font-black tabular-nums" style={{ color: "var(--text-main)" }}>
        <HalfPoints halves={standing.sideATotal} perUnit={standing.perUnit} />
        {" — "}
        <HalfPoints halves={standing.sideBTotal} perUnit={standing.perUnit} />
      </span>
      {!standing.over && (
        <span className="badge badge-pending">
          {standing.extending && extension ? extension : texts.inProgress}
        </span>
      )}
      {units.length > 0 && (
        <span className="flex items-center gap-1 flex-wrap">
          {units.map((unit) => {
            const mark = unitMark(unit);
            return (
              <span
                key={unit.id}
                title={texts.unitNumber(unitWord, unit.order)}
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
      {moves.length > 0 && (
        <span className="text-xs" style={{ color: "var(--copper-600)" }}>
          <Icon name="swords" size={12} className="icon-inline" />{" "}
          {moves
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
