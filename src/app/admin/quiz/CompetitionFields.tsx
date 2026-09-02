"use client";

import BoardsEditor from "./BoardsEditor";
import type { BoardConfig, Visibility } from "@/lib/competitionConfig";
import NumberField from "@/components/NumberField";
import { quizCompetition as texts } from "@/lib/texts";
import {
  toLocalInput,
  fromLocalInput,
  isPresetPeriod,
  CUSTOM_PERIOD,
  PERIOD_CHOICES,
  VISIBILITY_CHOICES,
} from "./competitionTypes";

export interface Draft {
  name: string;
  startsAt: string;
  visibility: Visibility;
  bankId: string;
  roundCount: number;
  roundPeriodMinutes: number;
  roundWindowMinutes: number;
  servedCount: number;
  categoryRounds: boolean;
  boards: BoardConfig[];
  fullSeconds: number;
  maxSeconds: number;
  floorPercent: number;
}

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

export default function CompetitionFields({
  draft,
  banks,
  locked,
  running = false,
  onChange,
}: {
  draft: Draft;
  banks: { id: string; name: string }[];
  locked: boolean;
  running?: boolean;
  onChange: <K extends keyof Draft>(key: K, value: Draft[K]) => void;
}) {
  const number = (key: keyof Draft, id: string, label: string, min = 1, max?: number) => (
    <Field label={label} id={id}>
      <NumberField
        id={id}
        min={min}
        max={max}
        value={draft[key] as number}
        disabled={locked}
        onChange={(value) => onChange(key, value as Draft[typeof key])}
      />
    </Field>
  );

  const custom = !isPresetPeriod(draft.roundPeriodMinutes);

  return (
    <>
      <Field label={texts.name} id="c-name">
        <input
          id="c-name"
          type="text"
          value={draft.name}
          disabled={locked && !running}
          onChange={(e) => onChange("name", e.target.value)}
          className="input input-sm"
        />
      </Field>

      <Field label={texts.visibility} id="c-visibility">
        <select
          id="c-visibility"
          value={draft.visibility}
          disabled={locked}
          onChange={(e) => onChange("visibility", e.target.value as Visibility)}
          className="input input-sm"
        >
          {VISIBILITY_CHOICES.map((choice) => (
            <option key={choice.value} value={choice.value}>
              {choice.label}
            </option>
          ))}
        </select>
      </Field>

      <Field label={texts.bank} id="c-bank">
        <select
          id="c-bank"
          value={draft.bankId}
          disabled={locked}
          onChange={(e) => onChange("bankId", e.target.value)}
          className="input input-sm"
        >
          {banks.map((bank) => (
            <option key={bank.id} value={bank.id}>
              {bank.name}
            </option>
          ))}
        </select>
      </Field>

      <Field label={texts.firstRound} id="c-start">
        <input
          id="c-start"
          type="datetime-local"
          value={toLocalInput(draft.startsAt)}
          disabled={locked}
          onChange={(e) => onChange("startsAt", fromLocalInput(e.target.value))}
          className="input input-sm"
        />
      </Field>

      {number("roundCount", "c-rounds", texts.roundCount)}

      <Field label={texts.period} id="c-period">
        <select
          id="c-period"
          value={custom ? CUSTOM_PERIOD : draft.roundPeriodMinutes}
          disabled={locked}
          onChange={(e) => {
            const picked = Number(e.target.value);
            const period = picked === CUSTOM_PERIOD ? 30 : picked;
            onChange("roundPeriodMinutes", period);
            if (draft.roundWindowMinutes > period) onChange("roundWindowMinutes", period);
          }}
          className="input input-sm"
        >
          {PERIOD_CHOICES.map((choice) => (
            <option key={choice.minutes} value={choice.minutes}>
              {choice.label}
            </option>
          ))}
        </select>
      </Field>

      {custom && (
        <Field label={texts.customPeriod} id="c-period-minutes">
          <NumberField
            id="c-period-minutes"
            min={1}
            value={draft.roundPeriodMinutes}
            disabled={locked}
            onChange={(period) => {
              onChange("roundPeriodMinutes", period);
              if (draft.roundWindowMinutes > period) onChange("roundWindowMinutes", period);
            }}
          />
        </Field>
      )}

      {number("roundWindowMinutes", "c-window", texts.window)}

      {number("servedCount", "c-served", texts.served)}
      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
        {texts.servedHint}
      </p>

      <label className="flex items-center gap-2 text-xs font-bold">
        <input
          id="c-category-rounds"
          type="checkbox"
          checked={draft.categoryRounds}
          disabled={locked}
          onChange={(e) => onChange("categoryRounds", e.target.checked)}
        />
        <span style={{ color: "var(--text-main)" }}>{texts.categoryRounds}</span>
      </label>

      <BoardsEditor
        boards={draft.boards}
        disabled={locked && !running}
        shapeLocked={running}
        onChange={(boards) => onChange("boards", boards)}
      />

      <p className="text-xs font-bold mt-1" style={{ color: "var(--text-main)" }}>
        {texts.speedTitle}
      </p>
      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
        {texts.speedHint}
      </p>

      {number("fullSeconds", "c-full", texts.fullSeconds, 0)}
      {number("maxSeconds", "c-max", texts.maxSeconds)}

      {number("floorPercent", "c-floor", texts.floorPercent, 0, 100)}
    </>
  );
}
