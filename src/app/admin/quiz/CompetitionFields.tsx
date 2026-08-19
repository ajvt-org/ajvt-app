"use client";

import SpeedBandsEditor from "./SpeedBandsEditor";
import type { SpeedBand } from "@/lib/competitionConfig";
import { toLocalInput, fromLocalInput, PERIOD_CHOICES } from "./competitionTypes";

export interface Draft {
  name: string;
  startsAt: string;
  roundCount: number;
  roundPeriodMinutes: number;
  roundWindowMinutes: number;
  servedCount: number;
  poolSize: number;
  groupSize: number;
  countingRounds: number;
  speedBands: SpeedBand[];
}

function Field({ label, id, children }: { label: string; id: string; children: React.ReactNode }) {
  return (
    <div className="flex-1 min-w-0">
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
  locked,
  onChange,
}: {
  draft: Draft;
  locked: boolean;
  onChange: <K extends keyof Draft>(key: K, value: Draft[K]) => void;
}) {
  const number = (key: keyof Draft, id: string, label: string, min = 1, max?: number) => (
    <Field label={label} id={id}>
      <input
        id={id}
        type="number"
        min={min}
        max={max}
        dir="ltr"
        value={draft[key] as number}
        disabled={locked}
        onChange={(e) => onChange(key, Number(e.target.value) as Draft[typeof key])}
        className="input input-sm"
      />
    </Field>
  );

  return (
    <>
      <Field label="اسم المسابقة" id="c-name">
        <input
          id="c-name"
          type="text"
          value={draft.name}
          disabled={locked}
          onChange={(e) => onChange("name", e.target.value)}
          className="input input-sm"
        />
      </Field>

      <div className="flex gap-2">
        <Field label="بداية الجولة الأولى" id="c-start">
          <input
            id="c-start"
            type="datetime-local"
            value={toLocalInput(draft.startsAt)}
            disabled={locked}
            onChange={(e) => onChange("startsAt", fromLocalInput(e.target.value))}
            className="input input-sm"
          />
        </Field>
        {number("roundCount", "c-rounds", "عدد الجولات")}
      </div>

      <div className="flex gap-2">
        <Field label="جولة كل" id="c-period">
          <select
            id="c-period"
            value={draft.roundPeriodMinutes}
            disabled={locked}
            onChange={(e) => onChange("roundPeriodMinutes", Number(e.target.value))}
            className="input input-sm"
          >
            {PERIOD_CHOICES.map((choice) => (
              <option key={choice.minutes} value={choice.minutes}>
                {choice.label}
              </option>
            ))}
          </select>
        </Field>
        {number("roundWindowMinutes", "c-window", "مدة الجولة بالدقائق")}
      </div>

      <div className="flex gap-2">
        {number("servedCount", "c-served", "أسئلة لكل مشارك")}
        {number("poolSize", "c-pool", "مخزون الجولة")}
      </div>

      <div className="flex gap-2">
        {number("groupSize", "c-group", "جولات المجموعة")}
        {number("countingRounds", "c-counting", "الجولات المحتسبة")}
      </div>

      <SpeedBandsEditor
        bands={draft.speedBands}
        disabled={locked}
        onChange={(speedBands) => onChange("speedBands", speedBands)}
      />
    </>
  );
}
