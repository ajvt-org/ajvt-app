"use client";

import IconLabel from "@/components/IconLabel";
import { seriesResult as texts } from "@/lib/texts";
import type { SeriesConfig } from "./seriesConfig";
import type { PartRow } from "./seriesTypes";

export interface PartDraft {
  outcome: "SIDE_A" | "SIDE_B" | "DRAW" | "";
  sideAPoints: string;
  sideBPoints: string;
}

export const EMPTY_DRAFT: PartDraft = { outcome: "", sideAPoints: "", sideBPoints: "" };

export function draftOf(part: PartRow): PartDraft {
  return {
    outcome: part.outcome ?? "",
    sideAPoints: part.sideAPoints === null ? "" : String(part.sideAPoints),
    sideBPoints: part.sideBPoints === null ? "" : String(part.sideBPoints),
  };
}

export function bodyOf(draft: PartDraft, config: SeriesConfig): Record<string, unknown> {
  if (config.partDecision === "OUTCOME") return { outcome: draft.outcome };
  return { sideAPoints: Number(draft.sideAPoints), sideBPoints: Number(draft.sideBPoints) };
}

export function draftIsReady(draft: PartDraft, config: SeriesConfig): boolean {
  if (config.partDecision === "OUTCOME") return draft.outcome !== "";
  return (
    Number.isInteger(Number(draft.sideAPoints)) &&
    Number.isInteger(Number(draft.sideBPoints)) &&
    draft.sideAPoints.trim() !== "" &&
    draft.sideBPoints.trim() !== ""
  );
}

export default function PartEditor({
  draft,
  config,
  sides,
  busy,
  editing,
  onChange,
  onSubmit,
  onCancel,
}: {
  draft: PartDraft;
  config: SeriesConfig;
  sides: string[];
  busy: boolean;
  editing: boolean;
  onChange: (draft: PartDraft) => void;
  onSubmit: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="space-y-2">
      {config.partDecision === "OUTCOME" ? (
        <select
          aria-label={texts.outcomeLabel}
          value={draft.outcome}
          disabled={busy}
          onChange={(e) => onChange({ ...draft, outcome: e.target.value as PartDraft["outcome"] })}
          className="input text-sm"
        >
          <option value="">{texts.pickOutcome}</option>
          <option value="SIDE_A">{texts.wonBy(sides[0])}</option>
          <option value="DRAW">{texts.drawn}</option>
          <option value="SIDE_B">{texts.wonBy(sides[1])}</option>
        </select>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <label className="text-xs font-bold" style={{ color: "var(--text-main)" }}>
            <bdi>{texts.pointsOf(sides[0])}</bdi>
            <input
              type="number"
              dir="ltr"
              min={0}
              disabled={busy}
              value={draft.sideAPoints}
              onChange={(e) => onChange({ ...draft, sideAPoints: e.target.value })}
              className="input text-sm mt-1"
            />
          </label>
          <label className="text-xs font-bold" style={{ color: "var(--text-main)" }}>
            <bdi>{texts.pointsOf(sides[1])}</bdi>
            <input
              type="number"
              dir="ltr"
              min={0}
              disabled={busy}
              value={draft.sideBPoints}
              onChange={(e) => onChange({ ...draft, sideBPoints: e.target.value })}
              className="input text-sm mt-1"
            />
          </label>
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={onSubmit}
          disabled={busy || !draftIsReady(draft, config)}
          className="btn btn-primary btn-sm"
        >
          <IconLabel name={editing ? "save" : "plus"}>{editing ? texts.save : texts.add}</IconLabel>
        </button>
        {editing && (
          <button onClick={onCancel} disabled={busy} className="btn btn-sm">
            {texts.cancel}
          </button>
        )}
      </div>
    </div>
  );
}
