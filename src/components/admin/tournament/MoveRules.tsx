"use client";

import { useState } from "react";
import Icon from "@/components/Icon";
import IconLabel from "@/components/IconLabel";
import { matchLevelsSetup as texts } from "@/lib/texts";
import type { LevelRow } from "@/lib/matchLevels";
import type { MoveRuleRow } from "./seriesTypes";

interface MoveDraft {
  name: string;
  unitsToSelf: string;
  unitsFromOther: string;
  levelId: string;
  endsUnit: boolean;
}

const EMPTY: MoveDraft = {
  name: "",
  unitsToSelf: "1",
  unitsFromOther: "0",
  levelId: "",
  endsUnit: false,
};

export function moveIsReady(draft: MoveDraft): boolean {
  return draft.name.trim() !== "" && draft.unitsToSelf !== "" && draft.unitsFromOther !== "";
}

export default function MoveRules({
  rules,
  levels,
  busy,
  onDeclare,
  onWithdraw,
}: {
  rules: MoveRuleRow[];
  levels: LevelRow[];
  busy: boolean;
  onDeclare: (draft: {
    name: string;
    unitsToSelf: number;
    unitsFromOther: number;
    levelId: string | null;
    endsUnit: boolean;
  }) => void;
  onWithdraw: (ruleId: string) => void;
}) {
  const [draft, setDraft] = useState<MoveDraft>(EMPTY);
  const nameOf = new Map(levels.map((level) => [level.id, level.singular]));

  return (
    <div className="space-y-2">
      <p className="text-xs font-bold" style={{ color: "var(--text-muted)" }}>
        <IconLabel name="swords">{texts.moves}</IconLabel>
      </p>

      {rules.length === 0 ? (
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          {texts.noMoves}
        </p>
      ) : (
        <div className="space-y-1.5">
          {rules.map((rule) => (
            <div
              key={rule.id}
              className="flex items-center gap-2 rounded-lg px-2.5 py-1.5"
              style={{ background: "var(--surface-2)" }}
            >
              <span className="min-w-0 flex-1 text-xs" style={{ color: "var(--text-main)" }}>
                <bdi>
                  {texts.moveLine(rule.name, String(rule.unitsToSelf), String(rule.unitsFromOther))}
                </bdi>
                {rule.levelId && nameOf.has(rule.levelId) && (
                  <span className="ms-2" style={{ color: "var(--text-muted)" }}>
                    <bdi>{nameOf.get(rule.levelId)}</bdi>
                  </span>
                )}
                {rule.endsUnit && (
                  <span className="ms-2" style={{ color: "var(--copper-600)" }}>
                    {texts.moveEndsLine}
                  </span>
                )}
              </span>
              <button
                aria-label={texts.removeMove(rule.name)}
                onClick={() => onWithdraw(rule.id)}
                disabled={busy}
                className="btn btn-icon btn-sm"
                style={{ color: "#991b1b" }}
              >
                <Icon name="trash" size={13} />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-2">
        <label className="block text-xs font-bold" style={{ color: "var(--text-main)" }}>
          <span className="block mb-1">{texts.moveName}</span>
          <input
            value={draft.name}
            disabled={busy}
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
            className="input input-sm w-full"
          />
        </label>
        <div className="grid grid-cols-2 gap-2">
          <label className="block text-xs font-bold" style={{ color: "var(--text-main)" }}>
            <span className="block mb-1">{texts.moveToSelf}</span>
            <input
              type="number"
              dir="ltr"
              min={0}
              value={draft.unitsToSelf}
              disabled={busy}
              onChange={(e) => setDraft({ ...draft, unitsToSelf: e.target.value })}
              className="input input-sm w-full"
            />
          </label>
          <label className="block text-xs font-bold" style={{ color: "var(--text-main)" }}>
            <span className="block mb-1">{texts.moveFromOther}</span>
            <input
              type="number"
              dir="ltr"
              min={0}
              value={draft.unitsFromOther}
              disabled={busy}
              onChange={(e) => setDraft({ ...draft, unitsFromOther: e.target.value })}
              className="input input-sm w-full"
            />
          </label>
        </div>
        <label className="block text-xs font-bold" style={{ color: "var(--text-main)" }}>
          <span className="block mb-1">{texts.moveLevel}</span>
          <select
            value={draft.levelId}
            disabled={busy}
            onChange={(e) => setDraft({ ...draft, levelId: e.target.value })}
            className="input input-sm w-full"
          >
            {levels.map((level) => (
              <option key={level.id} value={level.id}>
                {level.singular}
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 text-xs" style={{ color: "var(--text-main)" }}>
          <input
            type="checkbox"
            checked={draft.endsUnit}
            disabled={busy}
            onChange={(e) => setDraft({ ...draft, endsUnit: e.target.checked })}
          />
          <span>{texts.moveEndsUnit}</span>
        </label>
        <button
          onClick={() => {
            onDeclare({
              name: draft.name.trim(),
              unitsToSelf: Number(draft.unitsToSelf),
              unitsFromOther: Number(draft.unitsFromOther),
              levelId: draft.levelId || null,
              endsUnit: draft.endsUnit,
            });
            setDraft(EMPTY);
          }}
          disabled={busy || !moveIsReady(draft)}
          className="btn btn-primary btn-sm"
        >
          <IconLabel name="plus">{texts.addMove}</IconLabel>
        </button>
      </div>
    </div>
  );
}
