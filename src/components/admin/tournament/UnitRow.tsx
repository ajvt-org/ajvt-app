"use client";

import Icon from "@/components/Icon";
import IconLabel from "@/components/IconLabel";
import { seriesResult as texts } from "@/lib/texts";
import type { LevelRow } from "@/lib/matchLevels";
import type { UnitRow as Unit } from "./seriesTypes";

export function scoreText(unit: Unit, sides: string[]): string {
  if (unit.endedBy) return texts.endedBy(unit.endedBy.name);
  if (unit.abandoned) return texts.abandoned;
  if (unit.standing) {
    if (unit.standing.winner === "SIDE_A") return texts.wonBy(sides[0]);
    if (unit.standing.winner === "SIDE_B") return texts.wonBy(sides[1]);
    return `${unit.standing.sideATotal} — ${unit.standing.sideBTotal}`;
  }
  if (unit.outcome === "DRAW") return texts.drawn;
  if (unit.outcome === "SIDE_A") return texts.wonBy(sides[0]);
  if (unit.outcome === "SIDE_B") return texts.wonBy(sides[1]);
  if (unit.sideAPoints === null || unit.sideBPoints === null) return texts.abandoned;
  return `${unit.sideAPoints} — ${unit.sideBPoints}`;
}

export function colourText(
  unit: Unit,
  colours: { hasColours: boolean; firstColourWord: string | null },
  sides: string[],
): string | null {
  if (!colours.hasColours || unit.sideAColour === null) return null;
  const opener = unit.sideAColour === "FIRST" ? sides[0] : sides[1];
  return colours.firstColourWord ? texts.colourOf(opener, colours.firstColourWord) : null;
}

export default function UnitLine({
  unit,
  level,
  name: given,
  worthRule,
  sides,
  busy,
  editable,
  onKeepWorth,
  openable = false,
  opened = false,
  onToggle,
  onEdit,
  onRemove,
}: {
  unit: Unit;
  level: LevelRow;
  name?: string;
  worthRule?: { name: string; worth: number } | null;
  sides: string[];
  busy: boolean;
  editable: boolean;
  onKeepWorth?: (kept: boolean) => void;
  openable?: boolean;
  opened?: boolean;
  onToggle?: () => void;
  onEdit: () => void;
  onRemove: () => void;
}) {
  const name = given ?? texts.unitNumber(level.singular, unit.order);
  const doubled = (unit.worth ?? 1) > 1;
  const detected = worthRule ?? null;
  return (
    <div
      className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5"
      style={{ background: "var(--surface-2)", opacity: unit.abandoned ? 0.65 : 1 }}
    >
      <span className="text-xs font-bold shrink-0" style={{ color: "var(--mint-700)" }}>
        {name}
      </span>
      <span className="min-w-0 flex-1 text-xs" style={{ color: "var(--text-main)" }}>
        <bdi>{scoreText(unit, sides)}</bdi>
        {doubled && !detected && (
          <span className="ms-2" style={{ color: "var(--copper-600)" }}>
            {texts.countedTwice(String(unit.worth))}
          </span>
        )}
        {detected && (
          <span className="block" style={{ color: "var(--copper-600)" }}>
            <bdi>
              {unit.worthKept
                ? texts.worthByRule(detected.name, String(detected.worth))
                : texts.worthOff(detected.name)}
            </bdi>
          </span>
        )}
        {unit.decider && (
          <span className="ms-2" style={{ color: "var(--text-muted)" }}>
            {texts.decidingUnit}
          </span>
        )}
      </span>
      {openable && onToggle && (
        <button
          aria-label={opened ? texts.closeOne(name) : texts.openOne(name)}
          onClick={onToggle}
          disabled={busy}
          className="btn btn-icon btn-sm"
        >
          <Icon name={opened ? "chevronUp" : "chevronDown"} size={13} />
        </button>
      )}
      {detected && onKeepWorth && (
        <button
          onClick={() => onKeepWorth(!unit.worthKept)}
          disabled={busy}
          className="btn btn-sm shrink-0"
        >
          {unit.worthKept ? texts.turnWorthOff : texts.turnWorthOn}
        </button>
      )}
      {editable && (
        <>
          <button
            aria-label={`${texts.edit} ${name}`}
            onClick={onEdit}
            disabled={busy}
            className="btn btn-icon btn-sm"
          >
            <Icon name="pencil" size={13} />
          </button>
          <button
            aria-label={`${texts.remove} ${name}`}
            onClick={onRemove}
            disabled={busy}
            className="btn btn-icon btn-sm"
            style={{ color: "#991b1b" }}
          >
            <Icon name="trash" size={13} />
          </button>
        </>
      )}
    </div>
  );
}

export function UnitsEmpty() {
  return (
    <p className="text-xs" style={{ color: "var(--text-muted)" }}>
      <IconLabel name="list">{texts.none}</IconLabel>
    </p>
  );
}
