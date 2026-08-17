"use client";

import IconLabel from "@/components/IconLabel";
import type { SettingsForm as FormValues } from "./types";

const FIELDS: { key: keyof FormValues; label: string; min: number; max?: number; hint?: string }[] =
  [
    { key: "defaultAnswerCount", label: "عدد الإجابات الافتراضي", min: 2 },
    { key: "defaultCorrectCount", label: "عدد الإجابات الصحيحة الافتراضي", min: 1 },
    { key: "defaultPoints", label: "النقاط الافتراضية للسؤال", min: 1 },
    { key: "questionsPerDay", label: "عدد الأسئلة المرسلة يومياً", min: 1 },
    {
      key: "answerWindowSeconds",
      label: "مدة الإجابة بالثواني",
      min: 3,
      max: 300,
      hint: "تبدأ من لحظة إظهار الخيارات",
    },
    {
      key: "minScorePercent",
      label: "أقل نسبة للنقاط (%)",
      min: 0,
      max: 100,
      hint: "ما يناله من أجاب صحيحاً في آخر لحظة",
    },
  ];

export default function SettingsForm({
  values,
  error,
  saving,
  onChange,
  onSubmit,
}: {
  values: FormValues;
  error: string;
  saving: boolean;
  onChange: (key: keyof FormValues, value: string) => void;
  onSubmit: (ev: React.SubmitEvent<HTMLFormElement>) => void;
}) {
  return (
    <form onSubmit={onSubmit} className="card p-4 space-y-3">
      <p className="text-xs font-bold" style={{ color: "var(--text-muted)" }}>
        <IconLabel name="target">الإعدادات الافتراضية</IconLabel>
      </p>

      <div className="grid grid-cols-2 gap-3">
        {FIELDS.map((field) => (
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
            {field.hint && (
              <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
                {field.hint}
              </p>
            )}
          </div>
        ))}
      </div>

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
        {saving ? "..." : <IconLabel name="save">حفظ الإعدادات</IconLabel>}
      </button>
    </form>
  );
}
