"use client";

import Icon from "@/components/Icon";
import IconLabel from "@/components/IconLabel";
import Disclosure from "@/components/admin/Disclosure";
import { matchLevelsSetup as texts } from "@/lib/texts";
import { tournament as messages } from "@/lib/messages";
import type { WorthProblem, WorthWhen } from "@/lib/unitWorth";
import type { WorthDraft } from "./worthDraft";

type Change = (key: string, patch: Partial<WorthDraft>) => void;

function RuleFields({
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
            onChange={(e) => onChange(rule.key, { name: e.target.value })}
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

      <label className="block text-xs font-bold" style={{ color: "var(--text-main)" }}>
        <span className="block mb-1">{texts.worthWhen}</span>
        <select
          value={rule.when[0]}
          disabled={disabled}
          onChange={(e) => onChange(rule.key, { when: [e.target.value as WorthWhen] })}
          className="input input-sm w-full"
        >
          <option value="LOSER_ON_NOTHING">{texts.worthLoserOnNothing}</option>
          <option value="WINNER_LOST_CREDIT">{texts.worthWinnerLostCredit}</option>
        </select>
      </label>

      <label className="block text-xs font-bold" style={{ color: "var(--text-main)" }}>
        <span className="block mb-1">{texts.worthNumber}</span>
        <input
          type="number"
          inputMode="numeric"
          dir="ltr"
          min={2}
          value={rule.worth}
          disabled={disabled}
          onChange={(e) => onChange(rule.key, { worth: e.target.value })}
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

export default function LevelWorthRules({
  rules,
  faults,
  disabled,
  onChange,
  onAdd,
  onRemove,
}: {
  rules: WorthDraft[];
  faults: (WorthProblem | null)[];
  disabled: boolean;
  onChange: Change;
  onAdd: () => void;
  onRemove: (key: string) => void;
}) {
  return (
    <div className="space-y-2 pt-2">
      {rules.map((rule, index) => (
        <Disclosure
          key={rule.key}
          defaultOpen={rule.name.trim() === ""}
          title={
            <span className="text-xs">
              <bdi>{rule.name.trim() || texts.worthName}</bdi>
            </span>
          }
          color="var(--mint-700)"
          className="rounded-lg px-2.5 py-2"
          surface={{ border: "1px solid var(--mint-100)" }}
        >
          <RuleFields
            rule={rule}
            fault={faults[index]}
            disabled={disabled}
            onChange={onChange}
            onRemove={() => onRemove(rule.key)}
          />
        </Disclosure>
      ))}

      <button onClick={onAdd} disabled={disabled} className="btn btn-sm">
        <IconLabel name="plus">{texts.addWorthRule}</IconLabel>
      </button>
    </div>
  );
}
