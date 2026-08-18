"use client";

import SpeedBandsEditor from "./SpeedBandsEditor";
import type { SpeedBand } from "@/lib/competitionConfig";
import { toTimeValue, fromTimeValue } from "./competitionTypes";

export interface Draft {
  name: string;
  startsOn: string;
  days: number;
  publishMinutes: number;
  cutoffMinutes: number;
  servedCount: number;
  poolSize: number;
  weeklyCountingDays: number;
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
        <Field label="تاريخ البداية" id="c-start">
          <input
            id="c-start"
            type="date"
            value={draft.startsOn}
            disabled={locked}
            onChange={(e) => onChange("startsOn", e.target.value)}
            className="input input-sm"
          />
        </Field>
        {number("days", "c-days", "عدد الأيام")}
      </div>

      <div className="flex gap-2">
        <Field label="يفتح عند" id="c-open">
          <input
            id="c-open"
            type="time"
            value={toTimeValue(draft.publishMinutes)}
            disabled={locked}
            onChange={(e) => onChange("publishMinutes", fromTimeValue(e.target.value))}
            className="input input-sm"
          />
        </Field>
        <Field label="يغلق عند" id="c-close">
          <input
            id="c-close"
            type="time"
            value={toTimeValue(draft.cutoffMinutes)}
            disabled={locked}
            onChange={(e) => onChange("cutoffMinutes", fromTimeValue(e.target.value))}
            className="input input-sm"
          />
        </Field>
      </div>

      <div className="flex gap-2">
        {number("servedCount", "c-served", "أسئلة لكل مشارك")}
        {number("poolSize", "c-pool", "مخزون اليوم")}
        {number("weeklyCountingDays", "c-weekly", "أيام تُحتسب أسبوعياً", 1, 7)}
      </div>

      <SpeedBandsEditor
        bands={draft.speedBands}
        disabled={locked}
        onChange={(speedBands) => onChange("speedBands", speedBands)}
      />
    </>
  );
}
