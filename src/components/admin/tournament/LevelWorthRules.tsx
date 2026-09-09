"use client";

import Icon from "@/components/Icon";
import { matchLevelsSetup as texts } from "@/lib/texts";
import { tournament as messages } from "@/lib/messages";
import type { WorthProblem, WorthWhen } from "@/lib/unitWorth";
import type { WorthDraft } from "./worthDraft";

type Change = (patch: Partial<WorthDraft>) => void;

const SITUATIONS: { when: WorthWhen; label: string }[] = [
  { when: "LOSER_ON_NOTHING", label: texts.worthLoserOnNothing },
  { when: "WINNER_LOST_CREDIT", label: texts.worthWinnerLostCredit },
];

function picked(when: WorthWhen[], situation: WorthWhen, on: boolean): WorthWhen[] {
  const wanted = new Set(when);
  if (on) wanted.add(situation);
  else wanted.delete(situation);
  return SITUATIONS.map((each) => each.when).filter((each) => wanted.has(each));
}

export default function LevelWorthRules({
  rule,
  fault,
  disabled,
  onChange,
  onRemove,
}: {
  rule: WorthDraft;
  fault: WorthProblem | null;
  disabled: boolean;
  onChange: Change;
  onRemove: () => void;
}) {
  return (
    <div className="space-y-2 pt-2">
      <div className="flex items-end gap-2">
        <label
          className="block min-w-0 flex-1 text-xs font-bold"
          style={{ color: "var(--text-main)" }}
        >
          <span className="block mb-1">{texts.worthName}</span>
          <input
            value={rule.name}
            disabled={disabled}
            onChange={(e) => onChange({ name: e.target.value })}
            className="input input-sm w-full"
          />
        </label>
        <button
          aria-label={texts.removeWorthRule(rule.name || texts.worthName)}
          onClick={onRemove}
          disabled={disabled}
          className="btn btn-icon btn-sm shrink-0"
          style={{ color: "#991b1b" }}
        >
          <Icon name="trash" size={13} />
        </button>
      </div>

      <fieldset className="text-xs font-bold" style={{ color: "var(--text-main)" }}>
        <legend className="mb-1">{texts.worthWhen}</legend>
        <div className="space-y-1">
          {SITUATIONS.map((situation) => (
            <label key={situation.when} className="flex items-start gap-2 font-normal">
              <input
                type="checkbox"
                checked={rule.when.includes(situation.when)}
                disabled={disabled}
                onChange={(e) =>
                  onChange({ when: picked(rule.when, situation.when, e.target.checked) })
                }
                className="mt-0.5 w-4 h-4 shrink-0"
              />
              <span>{situation.label}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <label className="block text-xs font-bold" style={{ color: "var(--text-main)" }}>
        <span className="block mb-1">{texts.worthNumber}</span>
        <input
          type="number"
          inputMode="numeric"
          dir="ltr"
          min={2}
          value={rule.worth}
          disabled={disabled}
          onChange={(e) => onChange({ worth: e.target.value })}
          className="input input-sm w-full"
        />
      </label>

      {fault && (
        <p className="text-xs font-semibold" style={{ color: "#991b1b" }}>
          {messages.worthRule[fault]}
        </p>
      )}
    </div>
  );
}
