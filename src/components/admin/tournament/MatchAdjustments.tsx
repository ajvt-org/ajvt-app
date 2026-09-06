"use client";

import { useState } from "react";
import Icon from "@/components/Icon";
import IconLabel from "@/components/IconLabel";
import { countedNoun, ROUNDS } from "@/lib/arabicPlural";
import { seriesResult as texts } from "@/lib/texts";
import type { AdjustmentRuleRow, RecordedAdjustmentRow } from "./seriesTypes";

export function effectOf(rule: AdjustmentRuleRow): string {
  return texts.moveEffect(
    rule.name,
    countedNoun(rule.partsToSelf, ROUNDS),
    countedNoun(rule.partsFromOther, ROUNDS),
  );
}

export default function MatchAdjustments({
  rules,
  recorded,
  sides,
  partWord,
  busy,
  open,
  onRecord,
  onUndo,
}: {
  rules: AdjustmentRuleRow[];
  recorded: RecordedAdjustmentRow[];
  sides: string[];
  partWord: string;
  busy: boolean;
  open: boolean;
  onRecord: (ruleId: string, side: "SIDE_A" | "SIDE_B") => void;
  onUndo: (id: string) => void;
}) {
  const [ruleId, setRuleId] = useState("");
  const [side, setSide] = useState<"" | "SIDE_A" | "SIDE_B">("");

  if (rules.length === 0 && recorded.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="text-xs font-bold" style={{ color: "var(--text-muted)" }}>
        <IconLabel name="swords">{texts.moves}</IconLabel>
      </p>

      {recorded.length > 0 && (
        <div className="space-y-1.5">
          {recorded.map((row) => (
            <div
              key={row.id}
              className="flex items-center gap-2 rounded-lg px-2.5 py-1.5"
              style={{ background: "#fdf2e9" }}
            >
              <span className="min-w-0 flex-1 text-xs" style={{ color: "var(--copper-600)" }}>
                <bdi>
                  {texts.moveOf(row.rule.name, row.side === "SIDE_A" ? sides[0] : sides[1])}
                </bdi>
                <span className="ms-2" style={{ color: "var(--text-muted)" }}>
                  {texts.partNumber(partWord, row.order)}
                </span>
              </span>
              {open && (
                <button
                  aria-label={`${texts.undoMove} ${row.rule.name}`}
                  onClick={() => onUndo(row.id)}
                  disabled={busy}
                  className="btn btn-icon btn-sm"
                >
                  <Icon name="refresh" size={13} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {open && rules.length > 0 && (
        <div className="space-y-2">
          <select
            aria-label={texts.recordMove}
            value={ruleId}
            disabled={busy}
            onChange={(e) => setRuleId(e.target.value)}
            className="input input-sm"
          >
            <option value="">{texts.pickMove}</option>
            {rules.map((rule) => (
              <option key={rule.id} value={rule.id}>
                {effectOf(rule)}
              </option>
            ))}
          </select>
          <div className="flex gap-2">
            <select
              aria-label={texts.pickSide}
              value={side}
              disabled={busy}
              onChange={(e) => setSide(e.target.value as "SIDE_A" | "SIDE_B")}
              className="input input-sm min-w-0 flex-1"
            >
              <option value="">{texts.pickSide}</option>
              <option value="SIDE_A">{sides[0]}</option>
              <option value="SIDE_B">{sides[1]}</option>
            </select>
            <button
              onClick={() => {
                if (!ruleId || !side) return;
                onRecord(ruleId, side);
                setRuleId("");
                setSide("");
              }}
              disabled={busy || !ruleId || !side}
              className="btn btn-primary btn-sm shrink-0"
            >
              {texts.add}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
