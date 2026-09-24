"use client";

import NumberField from "@/components/NumberField";
import { toLocalInput, fromLocalInput } from "@/lib/localDateInput";
import { endsAt, ELECTION_MINUTES_MIN, ELECTION_MINUTES_MAX } from "@/lib/election";
import {
  CUSTOM_ELECTION_DURATION,
  electionAdmin as texts,
  electionDurations,
  isPresetDuration,
} from "@/lib/texts";
import { Field, Moment } from "./ElectionFieldParts";
import FrozenElectionFields from "./FrozenElectionFields";
import SettingRow from "./SettingRow";
import type { ElectionDraft } from "./electionTypes";

export default function ElectionFields({
  draft,
  frozen,
  closeControl,
  onChange,
}: {
  draft: ElectionDraft;
  frozen: boolean;
  closeControl?: React.ReactNode;
  onChange: <K extends keyof ElectionDraft>(key: K, value: ElectionDraft[K]) => void;
}) {
  const custom = !isPresetDuration(draft.durationMinutes);

  if (frozen) {
    return <FrozenElectionFields draft={draft} closeControl={closeControl} onChange={onChange} />;
  }

  return (
    <>
      <Field label={texts.title} id="e-title">
        <input
          id="e-title"
          type="text"
          value={draft.title}
          onChange={(e) => onChange("title", e.target.value)}
          className="input input-sm"
        />
      </Field>

      <SettingRow
        label={texts.hidden}
        checked={draft.hidden}
        onChange={(next) => onChange("hidden", next)}
      />

      <Field label={texts.startsAt} id="e-start">
        <input
          id="e-start"
          type="datetime-local"
          value={toLocalInput(draft.startsAt)}
          onChange={(e) => onChange("startsAt", fromLocalInput(e.target.value))}
          className="input input-sm"
        />
      </Field>

      <Field label={texts.duration} id="e-duration">
        <select
          id="e-duration"
          value={custom ? CUSTOM_ELECTION_DURATION : draft.durationMinutes}
          onChange={(e) => {
            const picked = Number(e.target.value);
            onChange("durationMinutes", picked === CUSTOM_ELECTION_DURATION ? 120 : picked);
          }}
          className="input input-sm"
        >
          {electionDurations.map((choice) => (
            <option key={choice.minutes} value={choice.minutes}>
              {choice.label}
            </option>
          ))}
        </select>
      </Field>

      {custom && (
        <Field label={texts.customDuration} id="e-duration-minutes">
          <NumberField
            id="e-duration-minutes"
            min={ELECTION_MINUTES_MIN}
            max={ELECTION_MINUTES_MAX}
            value={draft.durationMinutes}
            onChange={(minutes) => onChange("durationMinutes", minutes)}
          />
        </Field>
      )}

      <SettingRow
        label={texts.allowBlank}
        checked={draft.allowBlank}
        onChange={(next) => onChange("allowBlank", next)}
      />

      <SettingRow
        label={texts.shuffle}
        checked={draft.shuffleCandidates}
        onChange={(next) => onChange("shuffleCandidates", next)}
      />

      <SettingRow
        label={texts.showResults}
        checked={draft.showResults}
        onChange={(next) => onChange("showResults", next)}
      />

      {draft.startsAt && <Moment label={texts.closesAt} at={endsAt(draft)} />}
    </>
  );
}
