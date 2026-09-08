"use client";

import Icon from "@/components/Icon";
import IconLabel from "@/components/IconLabel";
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

export default function LevelMoves({
  moves,
  faults,
  under,
  disabled,
  onChange,
  onAdd,
  onRemove,
}: {
  moves: MoveDraft[];
  faults: (RuleProblem | null)[];
  under: string;
  disabled: boolean;
  onChange: Change;
  onAdd: () => void;
  onRemove: (key: string) => void;
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-bold" style={{ color: "var(--text-muted)" }}>
        <IconLabel name="swords">{texts.moves(under)}</IconLabel>
      </p>

      {moves.length === 0 && (
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          {texts.noMoves}
        </p>
      )}

      {moves.map((move, index) => (
        <div
          key={move.key}
          className="space-y-2 rounded-lg p-2.5"
          style={{ border: "1px solid var(--mint-100)" }}
        >
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
              onClick={() => onRemove(move.key)}
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

          {faults[index] && (
            <p className="text-xs font-semibold" style={{ color: "#991b1b" }}>
              {messages.moveRule[faults[index]!]}
            </p>
          )}
        </div>
      ))}

      <button onClick={onAdd} disabled={disabled} className="btn btn-sm">
        <IconLabel name="plus">{texts.addMove}</IconLabel>
      </button>
    </div>
  );
}
