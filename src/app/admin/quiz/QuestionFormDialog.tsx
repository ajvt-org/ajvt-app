"use client";

import DialogClose from "@/components/DialogClose";
import Icon from "@/components/Icon";
import IconLabel from "@/components/IconLabel";
import type { AnswerFormRow } from "./types";

export interface QuestionFormValues {
  text: string;
  category: string;
  points: string;
  correctCount: string;
  answers: AnswerFormRow[];
}

function AnswerRowInput({
  row,
  index,
  removable,
  onText,
  onToggle,
  onRemove,
}: {
  row: AnswerFormRow;
  index: number;
  removable: boolean;
  onText: (text: string) => void;
  onToggle: () => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={onToggle}
        aria-pressed={row.isCorrect}
        aria-label={`الإجابة ${index + 1} صحيحة`}
        className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
        style={
          row.isCorrect
            ? { background: "#d1fae5", color: "#065f46" }
            : {
                background: "#fff",
                border: "1.5px solid var(--mint-200)",
                color: "var(--text-muted)",
              }
        }
      >
        {row.isCorrect && <Icon name="check" size={14} />}
      </button>
      <input
        type="text"
        value={row.text}
        onChange={(e) => onText(e.target.value)}
        className="input text-sm"
        placeholder={`إجابة ${index + 1}`}
      />
      <button
        type="button"
        onClick={onRemove}
        disabled={!removable}
        aria-label="حذف الإجابة"
        className="text-sm shrink-0"
        style={{ color: "#dc2626", opacity: removable ? 1 : 0.3 }}
      >
        <Icon name="trash" size={14} />
      </button>
    </div>
  );
}

export default function QuestionFormDialog({
  values,
  editing,
  error,
  saving,
  onChange,
  onAnswers,
  onSubmit,
  onClose,
}: {
  values: QuestionFormValues;
  editing: boolean;
  error: string;
  saving: boolean;
  onChange: (patch: Partial<QuestionFormValues>) => void;
  onAnswers: (answers: AnswerFormRow[]) => void;
  onSubmit: (ev: React.SubmitEvent<HTMLFormElement>) => void;
  onClose: () => void;
}) {
  function setAnswer(index: number, patch: Partial<AnswerFormRow>) {
    onAnswers(values.answers.map((a, i) => (i === index ? { ...a, ...patch } : a)));
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center"
      style={{ background: "rgba(10,30,20,0.6)", backdropFilter: "blur(4px)" }}
      onClick={(ev) => {
        if (ev.target === ev.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-md rounded-t-3xl md:rounded-2xl overflow-y-auto"
        style={{ background: "var(--mint-50)", maxHeight: "92svh", direction: "rtl" }}
      >
        <div
          className="px-5 py-4 flex items-center justify-between sticky top-0"
          style={{ background: "linear-gradient(135deg, var(--mint-700), var(--mint-600))" }}
        >
          <h2 className="font-black text-white text-base">
            {editing ? (
              <IconLabel name="pencil">تعديل سؤال</IconLabel>
            ) : (
              <IconLabel name="plus">سؤال جديد</IconLabel>
            )}
          </h2>
          <DialogClose onClick={onClose} />
        </div>

        <form onSubmit={onSubmit} className="p-5 space-y-3">
          <div>
            <label
              className="block text-sm font-bold mb-1.5"
              style={{ color: "var(--text-main)" }}
              htmlFor="quiz-text"
            >
              نص السؤال <span style={{ color: "var(--copper-500)" }}>*</span>
            </label>
            <textarea
              id="quiz-text"
              value={values.text}
              onChange={(e) => onChange({ text: e.target.value })}
              rows={2}
              required
              className="input"
            />
          </div>

          <div>
            <label
              className="block text-sm font-bold mb-1.5"
              style={{ color: "var(--text-main)" }}
              htmlFor="quiz-category"
            >
              التصنيف <span style={{ color: "var(--copper-500)" }}>*</span>
            </label>
            <input
              id="quiz-category"
              type="text"
              value={values.category}
              onChange={(e) => onChange({ category: e.target.value })}
              placeholder="تاريخ، رياضة، جغرافيا..."
              required
              className="input"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label
                className="block text-sm font-bold mb-1.5"
                style={{ color: "var(--text-main)" }}
                htmlFor="quiz-points"
              >
                النقاط
              </label>
              <input
                id="quiz-points"
                type="number"
                dir="ltr"
                min={1}
                value={values.points}
                onChange={(e) => onChange({ points: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label
                className="block text-sm font-bold mb-1.5"
                style={{ color: "var(--text-main)" }}
                htmlFor="quiz-correct"
              >
                عدد الإجابات الصحيحة
              </label>
              <input
                id="quiz-correct"
                type="number"
                dir="ltr"
                min={1}
                value={values.correctCount}
                onChange={(e) => onChange({ correctCount: e.target.value })}
                className="input"
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="block text-sm font-bold" style={{ color: "var(--text-main)" }}>
                الإجابات
              </p>
              <button
                type="button"
                onClick={() => onAnswers([...values.answers, { text: "", isCorrect: false }])}
                className="text-xs px-2.5 py-1 rounded-lg font-bold"
                style={{ background: "var(--mint-100)", color: "var(--mint-700)" }}
              >
                <IconLabel name="plus">إضافة إجابة</IconLabel>
              </button>
            </div>

            {values.answers.map((row, index) => (
              <AnswerRowInput
                key={index}
                row={row}
                index={index}
                removable={values.answers.length > 2}
                onText={(text) => setAnswer(index, { text })}
                onToggle={() => setAnswer(index, { isCorrect: !row.isCorrect })}
                onRemove={() => onAnswers(values.answers.filter((_, i) => i !== index))}
              />
            ))}
          </div>

          {error && (
            <div
              className="p-3 rounded-xl text-sm font-semibold"
              style={{ background: "#fee2e2", color: "#991b1b" }}
            >
              <IconLabel name="warning">{error}</IconLabel>
            </div>
          )}

          <button type="submit" disabled={saving} className="btn btn-primary text-sm">
            {saving ? (
              "..."
            ) : editing ? (
              <IconLabel name="save">حفظ التعديل</IconLabel>
            ) : (
              "إضافة السؤال"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
