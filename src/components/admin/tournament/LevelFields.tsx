"use client";

import { matchLevelsSetup as texts } from "@/lib/texts";
import { tournament as messages } from "@/lib/messages";
import Disclosure from "@/components/admin/Disclosure";
import type { LevelDraft } from "./levelDraft";
import type { FaultField, LevelFix } from "./levelFaults";

type Change = (patch: Partial<LevelDraft>) => void;

function Fault({ fix, onFix }: { fix: LevelFix; onFix: () => void }) {
  return (
    <span className="mt-1 flex flex-wrap items-center gap-2 text-xs font-semibold">
      <span style={{ color: "#991b1b" }}>{messages.seriesSetup[fix.problem]}</span>
      {fix.patch && (
        <button onClick={onFix} className="btn btn-sm">
          {texts.offerFix}
        </button>
      )}
    </span>
  );
}

function Field({
  label,
  field,
  fix,
  onFix,
  children,
}: {
  label: string;
  field: FaultField;
  fix: LevelFix | null;
  onFix: () => void;
  children: React.ReactNode;
}) {
  const shown = fix && fix.field === field ? fix : null;
  return (
    <div>
      <label className="block text-xs font-bold" style={{ color: "var(--text-main)" }}>
        <span className="block mb-1">{label}</span>
        {children}
      </label>
      {shown && <Fault fix={shown} onFix={onFix} />}
    </div>
  );
}

function Num({
  label,
  field,
  value,
  disabled,
  fix,
  onFix,
  onChange,
}: {
  label: string;
  field: FaultField;
  value: string;
  disabled: boolean;
  fix: LevelFix | null;
  onFix: () => void;
  onChange: (value: string) => void;
}) {
  return (
    <Field label={label} field={field} fix={fix} onFix={onFix}>
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

export default function LevelFields({
  draft,
  last,
  disabled,
  locked,
  fix,
  onChange,
}: {
  draft: LevelDraft;
  last: boolean;
  disabled: boolean;
  locked: boolean;
  fix: LevelFix | null;
  onChange: Change;
}) {
  const apply = () => fix?.patch && onChange(fix.patch);
  const frozen = disabled || locked;
  const wordsFault = fix && fix.field === "words" ? fix : null;

  return (
    <div className="space-y-2">
      <label className="block text-xs font-bold" style={{ color: "var(--text-main)" }}>
        <span className="block mb-1">{texts.singular}</span>
        <input
          value={draft.singular}
          disabled={disabled}
          onChange={(e) => onChange({ singular: e.target.value })}
          className="input input-sm w-full"
        />
      </label>
      {wordsFault && <Fault fix={wordsFault} onFix={apply} />}

      {!last && (
        <Disclosure
          title={<span className="text-xs">{texts.rules}</span>}
          color="var(--mint-700)"
          className="rounded-lg px-2.5 py-2"
          surface={{ background: "var(--surface-2)" }}
        >
          <div className="space-y-2 pt-2">
            <Field label={texts.countedBy} field="countedBy" fix={fix} onFix={apply}>
              <select
                value={draft.countedBy}
                disabled={frozen}
                onChange={(e) => onChange({ countedBy: e.target.value as LevelDraft["countedBy"] })}
                className="input input-sm w-full"
              >
                <option value="">{texts.unsettledNever}</option>
                <option value="OUTCOME">{texts.countedByOutcome}</option>
                <option value="POINTS">{texts.countedByPoints}</option>
              </select>
            </Field>

            <Field label={texts.endsBy} field="endsBy" fix={fix} onFix={apply}>
              <select
                value={draft.endsBy}
                disabled={frozen}
                onChange={(e) => onChange({ endsBy: e.target.value as LevelDraft["endsBy"] })}
                className="input input-sm w-full"
              >
                <option value="">{texts.unsettledNever}</option>
                <option value="COUNT">{texts.endsByCount}</option>
                <option value="TARGET">{texts.endsByTarget}</option>
              </select>
            </Field>

            {draft.endsBy === "COUNT" && (
              <Num
                label={texts.unitCount}
                field="unitCount"
                value={draft.unitCount}
                disabled={frozen}
                fix={fix}
                onFix={apply}
                onChange={(unitCount) => onChange({ unitCount })}
              />
            )}

            {draft.endsBy === "TARGET" && (
              <>
                <Num
                  label={texts.target}
                  field="target"
                  value={draft.target}
                  disabled={frozen}
                  fix={fix}
                  onFix={apply}
                  onChange={(target) => onChange({ target })}
                />
                <Num
                  label={texts.deciderTarget}
                  field="deciderTarget"
                  value={draft.deciderTarget}
                  disabled={frozen}
                  fix={fix}
                  onFix={apply}
                  onChange={(deciderTarget) => onChange({ deciderTarget })}
                />
              </>
            )}

            <Field label={texts.unsettled} field="unsettled" fix={fix} onFix={apply}>
              <select
                value={draft.unsettled}
                disabled={frozen}
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
              <Num
                label={texts.margin}
                field="margin"
                value={draft.margin}
                disabled={frozen}
                fix={fix}
                onFix={apply}
                onChange={(margin) => onChange({ margin })}
              />
            )}

            {draft.unsettled === "CONTINUE" && draft.endsBy === "COUNT" && (
              <Num
                label={texts.continueUnits}
                field="continueUnits"
                value={draft.continueUnits}
                disabled={frozen}
                fix={fix}
                onFix={apply}
                onChange={(continueUnits) => onChange({ continueUnits })}
              />
            )}

            <Num
              label={texts.startingCredit}
              field="startingCredit"
              value={draft.startingCredit}
              disabled={frozen}
              fix={fix}
              onFix={apply}
              onChange={(startingCredit) => onChange({ startingCredit })}
            />
            {draft.startingCredit.trim() !== "" && draft.startingCredit.trim() !== "0" && (
              <Num
                label={texts.creditWindow}
                field="creditWindow"
                value={draft.creditWindow}
                disabled={frozen}
                fix={fix}
                onFix={apply}
                onChange={(creditWindow) => onChange({ creditWindow })}
              />
            )}
          </div>
        </Disclosure>
      )}

      {last && fix && fix.field !== "words" && <Fault fix={fix} onFix={apply} />}
    </div>
  );
}
