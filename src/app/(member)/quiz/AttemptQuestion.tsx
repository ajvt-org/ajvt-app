"use client";

import { useState } from "react";
import Icon from "@/components/Icon";
import NumericRanges from "@/components/NumericRanges";
import QuestionTimer from "./QuestionTimer";
import type { ScoreCurve } from "@/lib/competitionConfig";
import { countedNoun, ANSWERS } from "@/lib/arabicPlural";
import { QUESTION_THEME } from "./questionTheme";

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
  busy,
  onSubmit,
  onExpire,
}: {
  question: AttemptView;
  curve?: ScoreCurve;
  busy: boolean;
  onSubmit: (selected: string[]) => void;
  onExpire?: () => void;
}) {
  const [picked, setPicked] = useState<string[]>([]);
  const many = question.correctCount > 1;
  const theme = QUESTION_THEME;

  function toggle(id: string) {
    if (busy) return;
    setPicked((current) => {
      if (!many) return [id];
      return current.includes(id) ? current.filter((x) => x !== id) : [...current, id];
    });
  }

  const ready = many ? picked.length === question.correctCount : picked.length === 1;

  return (
    <div className="question-screen min-h-[100svh] px-5 pt-5 relative" style={theme.screen}>
      {theme.variant === "stage" && (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div
            className="absolute rounded-full pointer-events-none"
            style={{
              top: -80,
              insetInlineStart: -60,
              width: 260,
              height: 260,
              background: "radial-gradient(circle, rgba(74,156,126,0.35), rgba(74,156,126,0))",
            }}
          />
          <div
            className="absolute rounded-full pointer-events-none"
            style={{
              bottom: 40,
              insetInlineEnd: -80,
              width: 240,
              height: 240,
              background: "radial-gradient(circle, rgba(196,124,90,0.18), rgba(196,124,90,0))",
            }}
          />
        </div>
      )}

      <div className="relative mx-auto w-full max-w-md min-h-[calc(100svh-1.25rem)] flex flex-col">
        <div className="question-slide flex flex-col gap-5">
          {curve && <QuestionTimer shownAt={question.shownAt} curve={curve} onExpire={onExpire} />}

          <div style={theme.questionCard}>
            <h1 style={theme.questionText}>{question.text}</h1>
            {theme.variant === "stage" && (
              <div
                className="rounded-full mx-auto"
                style={{ width: 44, height: 4, background: "var(--mint-300)", marginTop: 14 }}
              />
            )}
          </div>

          {many && (
            <p className="text-xs text-center" style={theme.hint}>
              <NumericRanges>{`اختر ${countedNoun(question.correctCount, ANSWERS)}`}</NumericRanges>
            </p>
          )}

          <div className="flex flex-col gap-3">
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
                  className="question-option text-right rounded-2xl text-sm font-bold transition-all flex items-center gap-2.5"
                  style={{
                    padding: "15px 18px",
                    minHeight: 56,
                    ...(on ? theme.optionSelected : theme.option),
                  }}
                >
                  {on && (
                    <span
                      className="rounded-full flex items-center justify-center shrink-0"
                      style={{ width: 22, height: 22, ...theme.checkBubble }}
                    >
                      <Icon name="check" size={13} />
                    </span>
                  )}
                  {option.text}
                </button>
              );
            })}
          </div>
        </div>

        <div
          className="question-confirm mt-auto sticky bottom-0 -mx-5 px-5 pb-5 pt-6"
          style={theme.confirmBar}
        >
          {busy ? (
            <div
              className="w-full rounded-2xl flex items-center justify-center gap-2 text-sm font-bold"
              style={{ minHeight: 52, ...theme.locked }}
            >
              تم تسجيل إجابتك…
            </div>
          ) : (
            <button
              type="button"
              aria-label="تأكيد الإجابة"
              disabled={!ready}
              onClick={() => onSubmit(picked)}
              className="w-full text-sm font-bold text-white disabled:opacity-40 flex items-center justify-center gap-2"
              style={{ minHeight: 52, borderRadius: "0.875rem", ...theme.confirm }}
            >
              تأكيد <Icon name="chevronLeft" size={15} className="icon-inline" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
