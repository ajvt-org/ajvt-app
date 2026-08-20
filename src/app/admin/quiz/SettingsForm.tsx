"use client";

import IconLabel from "@/components/IconLabel";
import type { SettingsForm as FormValues } from "./types";

const FIELDS: { key: keyof FormValues; label: string; min: number; max?: number }[] = [
  { key: "defaultAnswerCount", label: "عدد الإجابات الافتراضي", min: 2 },
  { key: "defaultCorrectCount", label: "عدد الإجابات الصحيحة الافتراضي", min: 1 },
  { key: "defaultPoints", label: "النقاط الافتراضية للسؤال", min: 1, max: 20 },
];

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
        <IconLabel name="target">إعدادات الأسئلة</IconLabel>
      </p>

      <label className="flex items-center gap-2 text-xs font-bold">
        <input
          id="quiz-confirm-answers"
          type="checkbox"
          checked={confirmAnswers}
          disabled={saving}
          onChange={onToggleConfirm}
        />
        <span style={{ color: "var(--text-main)" }}>زر تأكيد الإجابة</span>
      </label>
      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
        عند إيقافه يرسل اختيار الإجابة مباشرة دون تأكيد في كل المسابقات، ويسري التغيير من الجولة
        القادمة. الأسئلة متعددة الإجابات تحتفظ بالزر دائماً.
      </p>

      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
        ما يظهر جاهزاً عند إضافة سؤال جديد. كل ما يخص سير المسابقة يضبط داخل المسابقة نفسها.
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
