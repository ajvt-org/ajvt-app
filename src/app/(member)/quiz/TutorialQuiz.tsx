"use client";

import { useEffect, useRef, useState } from "react";
import Icon from "@/components/Icon";
import NumericRanges from "@/components/NumericRanges";
import AttemptQuestion from "./AttemptQuestion";
import { gradeTutorial } from "@/lib/quizTutorial";
import type { TutorialView } from "@/lib/quizTutorialServer";
import type { ScoreCurve } from "@/lib/competitionConfig";
import { countedNoun, POINTS } from "@/lib/arabicPlural";

export default function TutorialQuiz({
  questions,
  curve,
  confirm = true,
  onExit,
}: {
  questions: TutorialView[];
  curve: ScoreCurve;
  confirm?: boolean;
  onExit: () => void;
}) {
  const [position, setPosition] = useState(0);
  const [score, setScore] = useState(0);
  const startedAt = useRef(0);

  useEffect(() => {
    startedAt.current = performance.now();
  }, [position]);

  const question = questions[position];
  const done = position >= questions.length;

  function answer(selected: string[]) {
    const elapsed = startedAt.current ? performance.now() - startedAt.current : 0;
    const graded = gradeTutorial(question, selected, elapsed, curve);
    setScore((s) => s + graded.points);
    setPosition((p) => p + 1);
  }

  function skip() {
    setPosition((p) => p + 1);
  }

  function again() {
    setPosition(0);
    setScore(0);
  }

  if (done) {
    return (
      <div
        className="question-screen relative overflow-hidden flex flex-col min-h-[100svh] px-6 py-10 items-center justify-center text-center text-white"
        style={{
          background:
            "linear-gradient(170deg, var(--mint-900), var(--mint-800) 55%, var(--mint-700))",
        }}
      >
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div
            className="absolute rounded-full"
            style={{
              top: -80,
              insetInlineStart: -60,
              width: 260,
              height: 260,
              background: "radial-gradient(circle, rgba(74,156,126,0.35), rgba(74,156,126,0))",
            }}
          />
          <div
            className="absolute rounded-full"
            style={{
              bottom: 40,
              insetInlineEnd: -80,
              width: 240,
              height: 240,
              background: "radial-gradient(circle, rgba(196,124,90,0.22), rgba(196,124,90,0))",
            }}
          />
          <span className="absolute opacity-80" style={{ top: "22%", insetInlineStart: 84 }}>
            <Icon name="sparkle" size={16} color="var(--copper-300)" />
          </span>
          <span className="absolute opacity-70" style={{ top: "28%", insetInlineEnd: 74 }}>
            <Icon name="sparkle" size={12} color="var(--mint-300)" />
          </span>
          <span className="absolute opacity-60" style={{ bottom: "29%", insetInlineStart: 60 }}>
            <Icon name="sparkle" size={11} color="var(--copper-300)" />
          </span>
        </div>

        <span
          className="relative inline-flex items-center gap-1.5 rounded-full text-xs font-black"
          style={{
            background: "rgba(196,124,90,0.18)",
            border: "1px solid rgba(232,176,138,0.5)",
            color: "var(--copper-300)",
            padding: "3px 14px",
          }}
        >
          <Icon name="play" size={13} />
          جولة تجريبية
        </span>

        <div
          className="relative rounded-full flex items-center justify-center"
          style={{
            marginTop: 28,
            width: 104,
            height: 104,
            background: "linear-gradient(135deg, var(--mint-600), var(--mint-700))",
            border: "3px solid var(--copper-500)",
            boxShadow: "0 0 0 8px rgba(196,124,90,0.15), 0 14px 40px rgba(0,0,0,0.35)",
          }}
        >
          <Icon name="check" size={52} />
        </div>

        <p className="relative text-2xl font-black" style={{ marginTop: 22 }}>
          أنهيت الجولة التجريبية
        </p>
        <p className="relative text-sm mt-1" style={{ color: "rgba(255,255,255,0.7)" }}>
          صرت تعرف اللعبة، والجولات الحقيقية بانتظارك
        </p>

        <div
          className="relative inline-flex items-center gap-2.5 rounded-2xl"
          style={{
            marginTop: 20,
            background: "rgba(255,255,255,0.08)",
            border: "1px solid rgba(255,255,255,0.14)",
            padding: "12px 26px",
          }}
        >
          <Icon name="star" size={22} filled color="var(--copper-300)" />
          <span className="text-2xl font-black tabular-nums">
            <NumericRanges>{`مجموعك ${countedNoun(score, POINTS)}`}</NumericRanges>
          </span>
        </div>
        <p className="relative text-xs mt-2" style={{ color: "rgba(255,255,255,0.55)" }}>
          لا تحتسب في المسابقة
        </p>

        <div className="relative w-full max-w-xs flex flex-col gap-3" style={{ marginTop: 34 }}>
          <button onClick={onExit} className="btn btn-copper text-sm font-bold">
            <Icon name="trophy" size={17} className="icon-inline" /> العودة للمسابقة
          </button>
          <button
            onClick={again}
            className="w-full text-sm font-extrabold text-white flex items-center justify-center gap-2"
            style={{
              minHeight: 48,
              borderRadius: 16,
              background: "rgba(255,255,255,0.08)",
              border: "1.5px solid rgba(255,255,255,0.22)",
            }}
          >
            <Icon name="refresh" size={16} /> إعادة التجربة
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div
        className="text-center text-xs py-1 font-bold"
        style={{ background: "var(--mint-100)", color: "var(--mint-700)" }}
      >
        جولة تجريبية، لا تحتسب نقاطها
      </div>
      <AttemptQuestion
        key={position}
        question={{
          answerId: question.id,
          text: question.text,
          category: question.category,
          points: question.points,
          correctCount: question.correctCount,
          shownAt: "",
          options: question.options,
        }}
        curve={curve}
        busy={false}
        confirm={confirm}
        onSubmit={answer}
        onExpire={skip}
      />
    </div>
  );
}
