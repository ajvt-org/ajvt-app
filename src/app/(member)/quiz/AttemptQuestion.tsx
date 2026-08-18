"use client";

import { useState } from "react";
import Icon from "@/components/Icon";
import NumericRanges from "@/components/NumericRanges";

export interface AttemptOption {
  id: string;
  text: string;
}

export interface AttemptView {
  answerId: string;
  text: string;
  category: string;
  points: number;
  correctCount: number;
  options: AttemptOption[];
}

export default function AttemptQuestion({
  question,
  position,
  total,
  busy,
  onSubmit,
}: {
  question: AttemptView;
  position: number;
  total: number;
  busy: boolean;
  onSubmit: (selected: string[]) => void;
}) {
  const [picked, setPicked] = useState<string[]>([]);
  const many = question.correctCount > 1;

  function toggle(id: string) {
    if (busy) return;
    setPicked((current) => {
      if (!many) return [id];
      return current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
    });
  }

  const ready = many ? picked.length === question.correctCount : picked.length === 1;

  return (
    <div
      className="flex flex-col min-h-[100svh] p-5 gap-4"
      style={{ background: "var(--mint-50)" }}
    >
      <div
        className="flex items-center justify-between text-xs"
        style={{ color: "var(--text-muted)" }}
      >
        <span className="font-bold">
          <NumericRanges>{`${position + 1} / ${total}`}</NumericRanges>
        </span>
        <span className="badge badge-pending">{question.category}</span>
      </div>

      <div
        className="h-1 rounded-full overflow-hidden"
        style={{ background: "var(--mint-100)" }}
        role="progressbar"
        aria-valuenow={position + 1}
        aria-valuemin={1}
        aria-valuemax={total}
      >
        <div
          className="h-full"
          style={{ width: `${((position + 1) / total) * 100}%`, background: "var(--mint-600)" }}
        />
      </div>

      <h1 className="text-lg font-black leading-relaxed mt-2" style={{ color: "var(--text-main)" }}>
        {question.text}
      </h1>

      {many && (
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          اختر {question.correctCount} إجابات
        </p>
      )}

      <div className="flex-1 flex flex-col gap-2.5 justify-center">
        {question.options.map((option) => {
          const on = picked.includes(option.id);
          return (
            <button
              key={option.id}
              type="button"
              role={many ? "checkbox" : "radio"}
              aria-checked={on}
              disabled={busy}
              onClick={() => toggle(option.id)}
              className="text-right p-4 rounded-2xl text-sm font-bold border-2 transition-all"
              style={{
                background: on ? "var(--mint-600)" : "white",
                color: on ? "white" : "var(--text-main)",
                borderColor: on ? "var(--mint-600)" : "var(--mint-100)",
              }}
            >
              {option.text}
            </button>
          );
        })}
      </div>

      <button
        type="button"
        aria-label="تأكيد الإجابة"
        disabled={!ready || busy}
        onClick={() => onSubmit(picked)}
        className="btn btn-primary w-full text-sm font-bold disabled:opacity-40"
      >
        {busy ? (
          "..."
        ) : (
          <>
            تأكيد <Icon name="chevronLeft" size={15} className="icon-inline" />
          </>
        )}
      </button>
    </div>
  );
}
