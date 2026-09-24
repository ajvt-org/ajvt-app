"use client";

import LocalMoment from "@/components/LocalMoment";
import NumberField from "@/components/NumberField";
import Toggle from "@/components/Toggle";
import { toLocalInput, fromLocalInput } from "@/lib/localDateInput";
import { counted } from "@/lib/arabicCount";
import { MINUTE } from "@/lib/messages";
import { endsAt, ELECTION_MINUTES_MIN, ELECTION_MINUTES_MAX } from "@/lib/election";
import {
  CUSTOM_ELECTION_DURATION,
  durationLabel,
  electionAdmin as texts,
  electionDurations,
  isPresetDuration,
} from "@/lib/texts";
import type { ElectionDraft } from "./electionTypes";

function Field({ label, id, children }: { label: string; id: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <label
        htmlFor={id}
        className="block text-xs font-bold mb-1"
        style={{ color: "var(--text-main)" }}
      >
        {label}
      </label>
      {children}
    </div>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-bold mb-1" style={{ color: "var(--text-main)" }}>
        {label}
      </p>
      <p
        className="text-sm font-bold"
        style={{ color: "var(--text-main)", overflowWrap: "anywhere" }}
      >
        {value}
      </p>
    </div>
  );
}

function Moment({ label, at }: { label: string; at: string | Date }) {
  return (
    <div className="min-w-0">
      <p className="text-xs font-bold mb-1" style={{ color: "var(--text-main)" }}>
        {label}
      </p>
      <p className="text-sm font-bold" style={{ color: "var(--text-main)" }}>
        <LocalMoment at={at} />
      </p>
    </div>
  );
}

function Switch({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-xs font-bold" style={{ color: "var(--text-main)" }}>
        {label}
      </span>
      <Toggle label={label} checked={checked} onChange={onChange} />
    </div>
  );
}

export default function ElectionFields({
  draft,
  frozen,
  onChange,
}: {
  draft: ElectionDraft;
  frozen: boolean;
  onChange: <K extends keyof ElectionDraft>(key: K, value: ElectionDraft[K]) => void;
}) {
  const said = (value: boolean) => (value ? texts.yes : texts.no);
  const custom = !isPresetDuration(draft.durationMinutes);

  if (frozen) {
    return (
      <>
        <Fact label={texts.title} value={draft.title} />
        <Moment label={texts.startsAt} at={draft.startsAt} />
        <Fact
          label={texts.duration}
          value={durationLabel(draft.durationMinutes, (minutes) => counted(minutes, MINUTE))}
        />
        <Moment label={texts.closesAt} at={endsAt(draft)} />
        <Fact label={texts.allowBlank} value={said(draft.allowBlank)} />
        <Fact label={texts.shuffle} value={said(draft.shuffleCandidates)} />
        <Switch
          label={texts.showResults}
          checked={draft.showResults}
          onChange={(next) => onChange("showResults", next)}
        />
      </>
    );
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

      <Switch
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

      <Switch
        label={texts.allowBlank}
        checked={draft.allowBlank}
        onChange={(next) => onChange("allowBlank", next)}
      />

      <Switch
        label={texts.shuffle}
        checked={draft.shuffleCandidates}
        onChange={(next) => onChange("shuffleCandidates", next)}
      />

      <Switch
        label={texts.showResults}
        checked={draft.showResults}
        onChange={(next) => onChange("showResults", next)}
      />

      {draft.startsAt && <Moment label={texts.closesAt} at={endsAt(draft)} />}
    </>
  );
}
