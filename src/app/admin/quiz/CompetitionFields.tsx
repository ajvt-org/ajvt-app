"use client";

import SpeedBandsEditor from "./SpeedBandsEditor";
import type { SpeedBand, Visibility } from "@/lib/competitionConfig";
import {
  toLocalInput,
  fromLocalInput,
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
  poolSize: number;
  groupSize: number;
  countingRounds: number;
  categoryRounds: boolean;
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
  banks,
  locked,
  onChange,
}: {
  draft: Draft;
  banks: { id: string; name: string }[];
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

      <Field label="نوع المسابقة" id="c-visibility">
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

      <Field label="بنك الأسئلة" id="c-bank">
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

      <label className="flex items-center gap-2 text-xs font-bold">
        <input
          id="c-category-rounds"
          type="checkbox"
          checked={draft.categoryRounds}
          disabled={locked}
          onChange={(e) => onChange("categoryRounds", e.target.checked)}
        />
        <span style={{ color: "var(--text-main)" }}>كل جولة من تصنيف واحد</span>
      </label>

      <SpeedBandsEditor
        bands={draft.speedBands}
        disabled={locked}
        onChange={(speedBands) => onChange("speedBands", speedBands)}
      />
    </>
  );
}
