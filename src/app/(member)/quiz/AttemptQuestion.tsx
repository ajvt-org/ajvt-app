"use client";

import { useState } from "react";
import Icon from "@/components/Icon";
import NumericRanges from "@/components/NumericRanges";
import QuestionTimer from "./QuestionTimer";
import type { ScoreCurve } from "@/lib/competitionConfig";

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
  shownAt: string;
  options: AttemptOption[];
}

export default function AttemptQuestion({
  question,
  curve,
  position,
  total,
  score,
  busy,
  onSubmit,
  onExpire,
}: {
  question: AttemptView;
  curve?: ScoreCurve;
  position: number;
  total: number;
  score?: number;
  busy: boolean;
  onSubmit: (selected: string[]) => void;
  onExpire?: () => void;
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
    <div className="min-h-[100svh] p-5 pb-28" style={{ background: "var(--mint-50)" }}>
      <div className="mx-auto w-full max-w-md flex flex-col gap-4">
        <div
          className="flex items-center justify-between text-xs"
          style={{ color: "var(--text-muted)" }}
        >
          <span className="font-bold">
            <NumericRanges>{`${position + 1} / ${total}`}</NumericRanges>
            {score !== undefined && (
              <span className="ms-2" style={{ color: "var(--mint-700)" }}>
                <NumericRanges>{`مجموعك ${score}`}</NumericRanges>
              </span>
            )}
          </span>
          <span className="flex items-center gap-2">
            <span className="badge badge-pending">{question.category}</span>
            <span className="font-bold" style={{ color: "var(--mint-700)" }}>
              <NumericRanges>{`${question.points} نقطة`}</NumericRanges>
            </span>
          </span>
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

        {curve && <QuestionTimer shownAt={question.shownAt} curve={curve} onExpire={onExpire} />}

        <h1 className="text-lg font-black leading-relaxed" style={{ color: "var(--text-main)" }}>
          {question.text}
        </h1>

        {many && (
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            <NumericRanges>{`اختر ${question.correctCount} إجابات`}</NumericRanges>
          </p>
        )}

        <div className="flex flex-col gap-2.5">
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
    </div>
  );
}
