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

function Switch({
  label,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  checked: boolean;
  disabled: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <label className="flex items-center gap-2 text-xs" style={{ color: "var(--text-main)" }}>
      <input
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(e) => onChange(e.target.checked)}
      />
      <span>{label}</span>
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

function EndingFields({
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
      <Field label={texts.ending}>
        <select
          value={draft.ending}
          disabled={disabled}
          onChange={(e) => onChange({ ending: e.target.value as LevelDraft["ending"] })}
          className="input input-sm w-full"
        >
          <option value="PLAY_ALL">{texts.endingPlayAll}</option>
          <option value="FIRST_TO">{texts.endingFirstTo}</option>
          <option value="FIRST_PAST">{texts.endingFirstPast}</option>
        </select>
      </Field>

      <Num
        label={texts.unitsPerParent}
        value={draft.unitsPerParent}
        disabled={disabled}
        onChange={(unitsPerParent) => onChange({ unitsPerParent })}
      />

      {draft.ending === "FIRST_TO" && (
        <Num
          label={texts.unitsToWin}
          value={draft.unitsToWin}
          disabled={disabled}
          onChange={(unitsToWin) => onChange({ unitsToWin })}
        />
      )}

      {draft.ending === "FIRST_PAST" && (
        <>
          <Num
            label={texts.target}
            value={draft.target}
            disabled={disabled}
            onChange={(target) => onChange({ target })}
          />
          <Field label={texts.bothPastTarget}>
            <select
              value={draft.bothPastTarget}
              disabled={disabled}
              onChange={(e) =>
                onChange({ bothPastTarget: e.target.value as LevelDraft["bothPastTarget"] })
              }
              className="input input-sm w-full"
            >
              <option value="HIGHER_TOTAL">{texts.higherTotal}</option>
              <option value="PLAY_ON">{texts.playOn}</option>
            </select>
          </Field>
        </>
      )}

      {draft.ending !== "PLAY_ALL" && (
        <Num
          label={texts.deciderTarget}
          value={draft.deciderTarget}
          disabled={disabled}
          onChange={(deciderTarget) => onChange({ deciderTarget })}
        />
      )}

      <Num
        label={texts.halvesPerUnit}
        value={draft.halvesPerUnit}
        disabled={disabled}
        onChange={(halvesPerUnit) => onChange({ halvesPerUnit })}
      />

      <Switch
        label={texts.extendsWhenLevel}
        checked={draft.extendsWhenLevel}
        disabled={disabled}
        onChange={(extendsWhenLevel) => onChange({ extendsWhenLevel })}
      />
      {draft.extendsWhenLevel && (
        <Num
          label={texts.extensionUnits}
          value={draft.extensionUnits}
          disabled={disabled}
          onChange={(extensionUnits) => onChange({ extensionUnits })}
        />
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

function UnitFields({
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
      <Field label={texts.decision}>
        <select
          value={draft.decision}
          disabled={disabled}
          onChange={(e) => onChange({ decision: e.target.value as LevelDraft["decision"] })}
          className="input input-sm w-full"
        >
          <option value="OUTCOME">{texts.decisionOutcome}</option>
          <option value="SCORE">{texts.decisionScore}</option>
        </select>
      </Field>

      <Num
        label={texts.wonUnitWorth}
        value={draft.wonUnitWorth}
        disabled={disabled}
        onChange={(wonUnitWorth) => onChange({ wonUnitWorth })}
      />
      <Num
        label={texts.doubledWorth}
        value={draft.doubledWorth}
        disabled={disabled}
        onChange={(doubledWorth) => onChange({ doubledWorth })}
      />
      <Switch
        label={texts.doublesOnBlankOpponent}
        checked={draft.doublesOnBlankOpponent}
        disabled={disabled}
        onChange={(doublesOnBlankOpponent) => onChange({ doublesOnBlankOpponent })}
      />
      <Switch
        label={texts.doublesOnRecoveredCredit}
        checked={draft.doublesOnRecoveredCredit}
        disabled={disabled}
        onChange={(doublesOnRecoveredCredit) => onChange({ doublesOnRecoveredCredit })}
      />
    </div>
  );
}

export default function LevelFields({
  draft,
  first,
  last,
  disabled,
  locked = false,
  onChange,
}: {
  draft: LevelDraft;
  first: boolean;
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

      <Disclosure
        title={<span className="text-xs">{texts.rules}</span>}
        color="var(--mint-700)"
        className="rounded-lg px-2.5 py-2"
        surface={{ background: "var(--surface-2)" }}
      >
        {!last && <EndingFields draft={draft} disabled={disabled || locked} onChange={onChange} />}
        {!first && <UnitFields draft={draft} disabled={disabled || locked} onChange={onChange} />}
      </Disclosure>
    </div>
  );
}
