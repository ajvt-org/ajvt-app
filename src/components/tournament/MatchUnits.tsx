"use client";

import { useState } from "react";
import Icon from "@/components/Icon";
import { matchUnitCard as texts } from "@/lib/texts";
import type { LevelRow } from "@/lib/matchLevels";
import type { UnitRow } from "@/components/admin/tournament/seriesTypes";

export function scoreOf(unit: UnitRow, sides: string[]): string {
  if (unit.endedBy) return texts.endedByRule(unit.endedBy.name);
  if (unit.abandoned) return texts.abandoned;
  const standing = unit.standing;
  if (standing) {
    if (standing.winner === "SIDE_A") return texts.wonBy(sides[0]);
    if (standing.winner === "SIDE_B") return texts.wonBy(sides[1]);
    return `${standing.sideATotal} — ${standing.sideBTotal}`;
  }
  if (unit.outcome === "DRAW") return texts.drawn;
  if (unit.outcome === "SIDE_A") return texts.wonBy(sides[0]);
  if (unit.outcome === "SIDE_B") return texts.wonBy(sides[1]);
  if (unit.sideAPoints === null || unit.sideBPoints === null) return texts.abandoned;
  return `${unit.sideAPoints} — ${unit.sideBPoints}`;
}

function UnitLine({ unit, levels, sides }: { unit: UnitRow; levels: LevelRow[]; sides: string[] }) {
  const [open, setOpen] = useState(false);
  const level = levels[0];
  const under = levels[1] ?? null;
  const name = texts.unitNumber(level.singular, unit.order);
  const openable = unit.children.length > 0 && under !== null;
  const doubled = (unit.worth ?? 1) > 1;

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5">
        <span className="text-xs font-bold shrink-0" style={{ color: "var(--mint-700)" }}>
          {name}
        </span>
        <span className="min-w-0 flex-1 text-xs" style={{ color: "var(--text-main)" }}>
          <bdi>{scoreOf(unit, sides)}</bdi>
          {doubled && (
            <span className="ms-2" style={{ color: "var(--copper-600)" }}>
              {texts.counted(String(unit.worth))}
            </span>
          )}
          {unit.decider && (
            <span className="ms-2" style={{ color: "var(--text-muted)" }}>
              {texts.decider}
            </span>
          )}
        </span>
        {openable && (
          <button
            type="button"
            aria-label={open ? texts.close(name) : texts.open(name)}
            aria-expanded={open}
            onClick={() => setOpen(!open)}
            className="btn btn-icon btn-sm"
          >
            <Icon name={open ? "chevronUp" : "chevronDown"} size={13} />
          </button>
        )}
      </div>
      {open && under && (
        <div className="ps-2 ms-1" style={{ borderInlineStart: "2px solid var(--mint-100)" }}>
          <p className="text-xs font-bold mb-1" style={{ color: "var(--text-muted)" }}>
            <bdi>{under.singular}</bdi>
          </p>
          <UnitList units={unit.children} levels={levels.slice(1)} sides={sides} />
        </div>
      )}
    </div>
  );
}

export function UnitList({
  units,
  levels,
  sides,
}: {
  units: UnitRow[];
  levels: LevelRow[];
  sides: string[];
}) {
  if (levels.length === 0 || units.length === 0) return null;
  return (
    <div className="space-y-1">
      {units.map((unit) => (
        <UnitLine key={unit.id} unit={unit} levels={levels} sides={sides} />
      ))}
    </div>
  );
}

export default function MatchUnits({
  units,
  levels,
  sides,
}: {
  units: UnitRow[];
  levels: LevelRow[];
  sides: string[];
}) {
  return <UnitList units={units} levels={levels.slice(1)} sides={sides} />;
}
