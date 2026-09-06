"use client";

import IconLabel from "@/components/IconLabel";
import { quizSettingsForm as texts } from "@/lib/texts";
import type { SettingsForm as FormValues } from "./types";

interface Field {
  key: keyof FormValues;
  label: string;
  min: number;
  max?: number;
}

const DEFAULT_FIELDS: Field[] = [
  { key: "defaultAnswerCount", label: texts.defaultAnswerCount, min: 2 },
  { key: "defaultCorrectCount", label: texts.defaultCorrectCount, min: 1 },
  { key: "defaultPoints", label: texts.defaultPoints, min: 1, max: 20 },
];

const TUTORIAL_FIELDS: Field[] = [
  { key: "tutorialFullSeconds", label: texts.tutorialFullSeconds, min: 0 },
  { key: "tutorialMaxSeconds", label: texts.tutorialMaxSeconds, min: 1 },
  { key: "tutorialFloorPercent", label: texts.tutorialFloorPercent, min: 0, max: 100 },
];

function NumberFields({
  fields,
  values,
  onChange,
}: {
  fields: Field[];
  values: FormValues;
  onChange: (key: keyof FormValues, value: string) => void;
}) {
  return (
    <div className="grid grid-cols-2 gap-3">
      {fields.map((field) => (
        <div key={field.key}>
          <label
            className="block text-xs font-bold mb-1"
            style={{ color: "var(--text-main)" }}
            htmlFor={`quiz-${field.key}`}
          >
            {field.label}
          </label>
          <input
            id={`quiz-${field.key}`}
            type="number"
            dir="ltr"
            min={field.min}
            max={field.max}
            className="input text-sm"
            value={values[field.key]}
            onChange={(e) => onChange(field.key, e.target.value)}
          />
        </div>
      ))}
    </div>
  );
}

export default function SettingsForm({
  values,
  confirmAnswers,
  error,
  saving,
  onChange,
  onToggleConfirm,
  onSubmit,
}: {
  values: FormValues;
  confirmAnswers: boolean;
  error: string;
  saving: boolean;
  onChange: (key: keyof FormValues, value: string) => void;
  onToggleConfirm: () => void;
  onSubmit: (ev: React.SubmitEvent<HTMLFormElement>) => void;
}) {
  return (
    <form onSubmit={onSubmit} className="card p-4 space-y-3">
      <p className="text-xs font-bold" style={{ color: "var(--text-muted)" }}>
        <IconLabel name="target">{texts.title}</IconLabel>
      </p>

      <label className="flex items-center gap-2 text-xs font-bold">
        <input
          id="quiz-confirm-answers"
          type="checkbox"
          checked={confirmAnswers}
          disabled={saving}
          onChange={onToggleConfirm}
        />
        <span style={{ color: "var(--text-main)" }}>{texts.confirmAnswers}</span>
      </label>
      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
        {texts.confirmAnswersKeeps}
      </p>

      <p className="text-xs font-bold pt-1" style={{ color: "var(--text-muted)" }}>
        <IconLabel name="list">{texts.defaultsTitle}</IconLabel>
      </p>
      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
        {texts.defaultsLead}
      </p>

      <NumberFields fields={DEFAULT_FIELDS} values={values} onChange={onChange} />

      <p className="text-xs font-bold pt-1" style={{ color: "var(--text-muted)" }}>
        <IconLabel name="clock">{texts.tutorialTitle}</IconLabel>
      </p>
      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
        {texts.tutorialBankLead}
      </p>

      <NumberFields fields={TUTORIAL_FIELDS} values={values} onChange={onChange} />

      {error && (
        <div
          className="p-2.5 rounded-lg text-xs font-semibold"
          style={{ background: "#fee2e2", color: "#991b1b" }}
        >
          <IconLabel name="warning">{error}</IconLabel>
        </div>
      )}

      <button
        type="submit"
        disabled={saving}
        className="text-xs px-3 py-2 rounded-lg font-bold"
        style={{ background: "var(--mint-600)", color: "white" }}
      >
        {saving ? "..." : <IconLabel name="save">{texts.save}</IconLabel>}
      </button>
    </form>
  );
}
