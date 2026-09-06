"use client";

import Icon from "@/components/Icon";
import IconLabel from "@/components/IconLabel";
import { seriesResult as texts } from "@/lib/texts";
import type { SeriesConfig } from "./seriesConfig";
import type { PartRow as Part } from "./seriesTypes";

export function outcomeText(part: Part, sides: string[]): string {
  if (part.abandoned) return texts.abandoned;
  if (part.outcome === "DRAW") return texts.drawn;
  if (part.outcome === "SIDE_A") return texts.wonBy(sides[0]);
  if (part.outcome === "SIDE_B") return texts.wonBy(sides[1]);
  if (part.sideAPoints === null || part.sideBPoints === null) return texts.abandoned;
  return `${part.sideAPoints} — ${part.sideBPoints}`;
}

export function colourText(part: Part, config: SeriesConfig, sides: string[]): string | null {
  if (!config.hasColours || part.sideAColour === null) return null;
  const opener = part.sideAColour === "FIRST" ? sides[0] : sides[1];
  return config.firstColourWord ? texts.colourOf(opener, config.firstColourWord) : null;
}

export default function PartLine({
  part,
  config,
  sides,
  busy,
  editable,
  onEdit,
  onRemove,
}: {
  part: Part;
  config: SeriesConfig;
  sides: string[];
  busy: boolean;
  editable: boolean;
  onEdit: () => void;
  onRemove: () => void;
}) {
  const colour = colourText(part, config, sides);
  return (
    <div
      className="flex items-center gap-2 rounded-lg px-2.5 py-1.5"
      style={{ background: "var(--surface-2)", opacity: part.abandoned ? 0.65 : 1 }}
    >
      <span className="text-xs font-bold shrink-0" style={{ color: "var(--mint-700)" }}>
        {texts.partNumber(config.partWord, part.order)}
      </span>
      <span className="min-w-0 flex-1 text-xs" style={{ color: "var(--text-main)" }}>
        <bdi>{outcomeText(part, sides)}</bdi>
        {colour && (
          <span className="ms-2" style={{ color: "var(--text-muted)" }}>
            <bdi>{colour}</bdi>
          </span>
        )}
      </span>
      {editable && (
        <>
          <button
            aria-label={`${texts.edit} ${texts.partNumber(config.partWord, part.order)}`}
            onClick={onEdit}
            disabled={busy}
            className="btn btn-icon btn-sm"
          >
            <Icon name="pencil" size={13} />
          </button>
          <button
            aria-label={`${texts.remove} ${texts.partNumber(config.partWord, part.order)}`}
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

export function PartsEmpty({ config }: { config: SeriesConfig }) {
  return (
    <p className="text-xs" style={{ color: "var(--text-muted)" }}>
      <IconLabel name="list">{texts.none(config.partsWord)}</IconLabel>
    </p>
  );
}
