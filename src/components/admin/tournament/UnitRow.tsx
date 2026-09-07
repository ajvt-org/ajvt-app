"use client";

import Icon from "@/components/Icon";
import IconLabel from "@/components/IconLabel";
import { seriesResult as texts } from "@/lib/texts";
import type { SeriesConfig } from "./seriesConfig";
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

export function colourText(unit: Unit, config: SeriesConfig, sides: string[]): string | null {
  if (!config.hasColours || unit.sideAColour === null) return null;
  const opener = unit.sideAColour === "FIRST" ? sides[0] : sides[1];
  return config.firstColourWord ? texts.colourOf(opener, config.firstColourWord) : null;
}

export default function UnitLine({
  unit,
  config,
  sides,
  busy,
  editable,
  onEdit,
  onRemove,
}: {
  unit: Unit;
  config: SeriesConfig;
  sides: string[];
  busy: boolean;
  editable: boolean;
  onEdit: () => void;
  onRemove: () => void;
}) {
  const colour = colourText(unit, config, sides);
  const name = texts.unitNumber(config.unit.singular, unit.order);
  return (
    <div
      className="flex items-center gap-2 rounded-lg px-2.5 py-1.5"
      style={{ background: "var(--surface-2)", opacity: unit.abandoned ? 0.65 : 1 }}
    >
      <span className="text-xs font-bold shrink-0" style={{ color: "var(--mint-700)" }}>
        {name}
      </span>
      <span className="min-w-0 flex-1 text-xs" style={{ color: "var(--text-main)" }}>
        <bdi>{scoreText(unit, sides)}</bdi>
        {colour && (
          <span className="ms-2" style={{ color: "var(--text-muted)" }}>
            <bdi>{colour}</bdi>
          </span>
        )}
      </span>
      {editable && (
        <>
          <button
            aria-label={`${texts.edit} ${name}`}
            onClick={onEdit}
            disabled={busy || unit.children.length > 0}
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

export function UnitsEmpty({ config }: { config: SeriesConfig }) {
  return (
    <p className="text-xs" style={{ color: "var(--text-muted)" }}>
      <IconLabel name="list">{texts.none(config.unit.plural)}</IconLabel>
    </p>
  );
}
