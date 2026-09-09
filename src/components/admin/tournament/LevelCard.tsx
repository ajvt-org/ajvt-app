"use client";

import Icon from "@/components/Icon";
import IconLabel from "@/components/IconLabel";
import Disclosure from "@/components/admin/Disclosure";
import { matchLevelsSetup as texts } from "@/lib/texts";
import { levelPlace } from "@/lib/seriesSetup";
import type { RuleProblem } from "@/lib/moveRules";
import LevelFields from "./LevelFields";
import LevelMoves from "./LevelMoves";
import LevelWorthRules from "./LevelWorthRules";
import type { LevelDraft } from "./levelDraft";
import type { LevelFix } from "./levelFaults";
import type { MoveDraft } from "./moveDraft";
import type { WorthDraft } from "./worthDraft";
import type { WorthProblem } from "@/lib/unitWorth";

export interface LevelMovesApi {
  drafts: MoveDraft[];
  faults: (RuleProblem | null)[];
  onChange: (key: string, patch: Partial<MoveDraft>) => void;
  onAdd: () => void;
  onRemove: (key: string) => void;
}

export interface LevelWorthApi {
  draft: WorthDraft | null;
  fault: WorthProblem | null;
  onChange: (patch: Partial<WorthDraft>) => void;
  onDeclare: () => void;
  onRemove: () => void;
}

export default function LevelCard({
  draft,
  own,
  index,
  count,
  frozen,
  fix,
  moves,
  worth,
  onChange,
  onMove,
  onRemove,
}: {
  draft: LevelDraft;
  own: string;
  index: number;
  count: number;
  frozen: boolean;
  fix: LevelFix | null;
  moves: LevelMovesApi;
  worth: LevelWorthApi;
  onChange: (patch: Partial<LevelDraft>) => void;
  onMove: (to: number) => void;
  onRemove: () => void;
}) {
  return (
    <div className="rounded-lg p-2.5 space-y-2" style={{ border: "1px solid var(--mint-100)" }}>
      <div className="flex items-center gap-1.5">
        <span className="min-w-0 flex-1 text-xs font-bold" style={{ color: "var(--mint-700)" }}>
          <bdi>{own}</bdi>
        </span>
        <button
          aria-label={texts.moveUp(index + 1)}
          onClick={() => onMove(index - 1)}
          disabled={frozen || index === 0}
          className="btn btn-icon btn-sm"
        >
          <Icon name="chevronUp" size={13} />
        </button>
        <button
          aria-label={texts.moveDown(index + 1)}
          onClick={() => onMove(index + 1)}
          disabled={frozen || index === count - 1}
          className="btn btn-icon btn-sm"
        >
          <Icon name="chevronDown" size={13} />
        </button>
        <button
          aria-label={texts.removeLevel(index + 1)}
          onClick={onRemove}
          disabled={frozen}
          className="btn btn-icon btn-sm"
          style={{ color: "#991b1b" }}
        >
          <Icon name="trash" size={13} />
        </button>
      </div>

      <LevelFields
        draft={draft}
        place={levelPlace(index, count)}
        disabled={frozen}
        locked={false}
        fix={fix}
        onChange={onChange}
      />

      {index > 0 &&
        (worth.draft === null ? (
          <button onClick={worth.onDeclare} disabled={frozen} className="btn btn-sm">
            <IconLabel name="plus">{texts.addWorthRule}</IconLabel>
          </button>
        ) : (
          <Disclosure
            defaultOpen={worth.draft.name.trim() === ""}
            title={<span className="text-xs">{texts.worthRules}</span>}
            color="var(--mint-700)"
            className="rounded-lg px-2.5 py-2"
            surface={{ background: "var(--surface-2)" }}
          >
            <LevelWorthRules
              rule={worth.draft}
              fault={worth.fault}
              disabled={frozen}
              onChange={worth.onChange}
              onRemove={worth.onRemove}
            />
          </Disclosure>
        ))}

      {index > 0 &&
        (moves.drafts.length === 0 ? (
          <button onClick={moves.onAdd} disabled={frozen} className="btn btn-sm">
            <IconLabel name="plus">{texts.addMove}</IconLabel>
          </button>
        ) : (
          <Disclosure
            defaultOpen={moves.drafts.some((move) => move.name.trim() === "")}
            title={<span className="text-xs">{texts.moves(own)}</span>}
            color="var(--mint-700)"
            className="rounded-lg px-2.5 py-2"
            surface={{ background: "var(--surface-2)" }}
          >
            <LevelMoves
              moves={moves.drafts}
              faults={moves.faults}
              disabled={frozen}
              onChange={moves.onChange}
              onAdd={moves.onAdd}
              onRemove={moves.onRemove}
            />
          </Disclosure>
        ))}
    </div>
  );
}
