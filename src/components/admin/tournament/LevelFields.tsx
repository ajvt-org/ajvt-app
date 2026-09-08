"use client";

import Disclosure from "@/components/admin/Disclosure";
import { matchLevelsSetup as texts } from "@/lib/texts";
import type { LevelDraft } from "./levelDraft";

type Change = (patch: Partial<LevelDraft>) => void;

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block text-xs font-bold" style={{ color: "var(--text-main)" }}>
      <span className="block mb-1">{label}</span>
      {children}
    </label>
  );
}

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
    <Field label={label}>
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
    </Field>
  );
}

function RuleFields({
  draft,
  disabled,
  onChange,
}: {
  draft: LevelDraft;
  disabled: boolean;
  onChange: Change;
}) {
  return (
    <div className="space-y-2 mt-2">
      <Field label={texts.countedBy}>
        <select
          value={draft.countedBy}
          disabled={disabled}
          onChange={(e) => onChange({ countedBy: e.target.value as LevelDraft["countedBy"] })}
          className="input input-sm w-full"
        >
          <option value="OUTCOME">{texts.countedByOutcome}</option>
          <option value="POINTS">{texts.countedByPoints}</option>
        </select>
      </Field>

      <Field label={texts.endsBy}>
        <select
          value={draft.endsBy}
          disabled={disabled}
          onChange={(e) => onChange({ endsBy: e.target.value as LevelDraft["endsBy"] })}
          className="input input-sm w-full"
        >
          <option value="COUNT">{texts.endsByCount}</option>
          <option value="TARGET">{texts.endsByTarget}</option>
        </select>
      </Field>

      {draft.endsBy === "COUNT" && (
        <Num
          label={texts.unitCount}
          value={draft.unitCount}
          disabled={disabled}
          onChange={(unitCount) => onChange({ unitCount })}
        />
      )}

      {draft.endsBy === "TARGET" && (
        <>
          <Num
            label={texts.target}
            value={draft.target}
            disabled={disabled}
            onChange={(target) => onChange({ target })}
          />
          <Num
            label={texts.deciderTarget}
            value={draft.deciderTarget}
            disabled={disabled}
            onChange={(deciderTarget) => onChange({ deciderTarget })}
          />
        </>
      )}

      <Field label={texts.unsettled}>
        <select
          value={draft.unsettled}
          disabled={disabled}
          onChange={(e) => onChange({ unsettled: e.target.value as LevelDraft["unsettled"] })}
          className="input input-sm w-full"
        >
          <option value="">{texts.unsettledNever}</option>
          <option value="CONTINUE">{texts.unsettledContinue}</option>
          <option value="DECIDER">{texts.unsettledDecider}</option>
          <option value="DRAW">{texts.unsettledDraw}</option>
        </select>
      </Field>

      {draft.unsettled === "CONTINUE" && (
        <>
          <Num
            label={texts.margin}
            value={draft.margin}
            disabled={disabled}
            onChange={(margin) => onChange({ margin })}
          />
          <Num
            label={texts.continueUnits}
            value={draft.continueUnits}
            disabled={disabled}
            onChange={(continueUnits) => onChange({ continueUnits })}
          />
        </>
      )}

      <Num
        label={texts.startingCredit}
        value={draft.startingCredit}
        disabled={disabled}
        onChange={(startingCredit) => onChange({ startingCredit })}
      />
      {draft.startingCredit.trim() !== "" && draft.startingCredit.trim() !== "0" && (
        <Num
          label={texts.creditWindow}
          value={draft.creditWindow}
          disabled={disabled}
          onChange={(creditWindow) => onChange({ creditWindow })}
        />
      )}
    </div>
  );
}

export default function LevelFields({
  draft,
  last,
  disabled,
  locked = false,
  onChange,
}: {
  draft: LevelDraft;
  last: boolean;
  disabled: boolean;
  locked?: boolean;
  onChange: Change;
}) {
  return (
    <div className="space-y-2">
      <div className="grid grid-cols-2 gap-2">
        <Field label={texts.singular}>
          <input
            value={draft.singular}
            disabled={disabled}
            onChange={(e) => onChange({ singular: e.target.value })}
            className="input input-sm w-full"
          />
        </Field>
        <Field label={texts.plural}>
          <input
            value={draft.plural}
            disabled={disabled}
            onChange={(e) => onChange({ plural: e.target.value })}
            className="input input-sm w-full"
          />
        </Field>
      </div>

      {!last && (
        <Disclosure
          title={<span className="text-xs">{texts.rules}</span>}
          color="var(--mint-700)"
          className="rounded-lg px-2.5 py-2"
          surface={{ background: "var(--surface-2)" }}
        >
          <RuleFields draft={draft} disabled={disabled || locked} onChange={onChange} />
        </Disclosure>
      )}
    </div>
  );
}
