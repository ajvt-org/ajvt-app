"use client";

import Icon from "@/components/Icon";
import IconLabel from "@/components/IconLabel";
import Disclosure from "@/components/admin/Disclosure";
import { matchLevelsSetup as texts } from "@/lib/texts";
import { tournament as messages } from "@/lib/messages";
import type { RuleProblem } from "@/lib/moveRules";
import type { MoveDraft } from "./moveDraft";

type Change = (key: string, patch: Partial<MoveDraft>) => void;

function Num({
  label,
  value,
  disabled,
  onChange,
}: {
  label: string;
  value: string;
  disabled: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block text-xs font-bold" style={{ color: "var(--text-main)" }}>
      <span className="block mb-1">{label}</span>
      <input
        type="number"
        inputMode="numeric"
        dir="ltr"
        min={0}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="input input-sm w-full"
      />
    </label>
  );
}

function MoveFields({
  move,
  fault,
  disabled,
  onChange,
  onRemove,
}: {
  move: MoveDraft;
  fault: RuleProblem | null;
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
          <span className="block mb-1">{texts.moveName}</span>
          <input
            value={move.name}
            disabled={disabled}
            onChange={(e) => onChange(move.key, { name: e.target.value })}
            className="input input-sm w-full"
          />
        </label>
        <button
          aria-label={texts.removeMove(move.name || texts.moveName)}
          onClick={onRemove}
          disabled={disabled}
          className="btn btn-icon btn-sm shrink-0"
          style={{ color: "#991b1b" }}
        >
          <Icon name="trash" size={13} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Num
          label={texts.moveToSelf}
          value={move.unitsToSelf}
          disabled={disabled}
          onChange={(unitsToSelf) => onChange(move.key, { unitsToSelf })}
        />
        <Num
          label={texts.moveFromOther}
          value={move.unitsFromOther}
          disabled={disabled}
          onChange={(unitsFromOther) => onChange(move.key, { unitsFromOther })}
        />
      </div>

      <Num
        label={texts.moveWorth}
        value={move.unitWorth}
        disabled={disabled}
        onChange={(unitWorth) => onChange(move.key, { unitWorth })}
      />

      <label className="flex items-center gap-2 text-xs" style={{ color: "var(--text-main)" }}>
        <input
          type="checkbox"
          checked={move.endsUnit}
          disabled={disabled}
          onChange={(e) => onChange(move.key, { endsUnit: e.target.checked })}
        />
        <span>{texts.moveEndsUnit}</span>
      </label>

      {fault && (
        <p className="text-xs font-semibold" style={{ color: "#991b1b" }}>
          {messages.moveRule[fault]}
        </p>
      )}
    </div>
  );
}

export default function LevelMoves({
  moves,
  faults,
  disabled,
  onChange,
  onAdd,
  onRemove,
}: {
  moves: MoveDraft[];
  faults: (RuleProblem | null)[];
  disabled: boolean;
  onChange: Change;
  onAdd: () => void;
  onRemove: (key: string) => void;
}) {
  return (
    <div className="space-y-2 pt-2">
      {moves.map((move, index) => (
        <Disclosure
          key={move.key}
          defaultOpen={move.name.trim() === ""}
          title={
            <span className="text-xs">
              <bdi>{move.name.trim() || texts.moveName}</bdi>
            </span>
          }
          color="var(--mint-700)"
          className="rounded-lg px-2.5 py-2"
          surface={{ border: "1px solid var(--mint-100)" }}
        >
          <MoveFields
            move={move}
            fault={faults[index]}
            disabled={disabled}
            onChange={onChange}
            onRemove={() => onRemove(move.key)}
          />
        </Disclosure>
      ))}

      <button onClick={onAdd} disabled={disabled} className="btn btn-sm">
        <IconLabel name="plus">{texts.addMove}</IconLabel>
      </button>
    </div>
  );
}
