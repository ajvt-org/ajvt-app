"use client";

import { useEffect, useRef, useState } from "react";
import Icon from "@/components/Icon";
import NumericRanges from "@/components/NumericRanges";
import AttemptQuestion from "./AttemptQuestion";
import { TUTORIAL_QUESTIONS, gradeTutorial } from "@/lib/quizTutorial";
import { DEFAULT_CURVE, type ScoreCurve } from "@/lib/competitionConfig";

export default function TutorialQuiz({
  curve,
  onExit,
}: {
  curve?: ScoreCurve;
  onExit: () => void;
}) {
  const [position, setPosition] = useState(0);
  const [score, setScore] = useState(0);
  const startedAt = useRef(0);

  useEffect(() => {
    startedAt.current = performance.now();
  }, [position]);

  const question = TUTORIAL_QUESTIONS[position];
  const done = position >= TUTORIAL_QUESTIONS.length;

  function answer(selected: string[]) {
    const elapsed = startedAt.current ? performance.now() - startedAt.current : 0;
    const graded = gradeTutorial(question, selected, elapsed, curve);
    setScore((s) => s + graded.points);
    setPosition((p) => p + 1);
  }

  function again() {
    setPosition(0);
    setScore(0);
  }

  if (done) {
    return (
      <div
        className="flex flex-col min-h-[100svh] p-5 gap-4 items-center justify-center text-center"
        style={{ background: "var(--mint-50)" }}
      >
        <span className="badge badge-pending text-xs">جولة تجريبية</span>
        <div style={{ color: "var(--mint-600)" }}>
          <Icon name="check" size={56} />
        </div>
        <p className="text-lg font-black" style={{ color: "var(--text-main)" }}>
          أنهيت الجولة التجريبية
        </p>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          <NumericRanges>{`مجموعك ${score} نقطة، وهي لا تحتسب في المسابقة`}</NumericRanges>
        </p>
        <button onClick={again} className="btn btn-primary w-full max-w-xs text-sm font-bold">
          إعادة التجربة
        </button>
        <button onClick={onExit} className="btn w-full max-w-xs text-sm font-bold">
          العودة للمسابقة
        </button>
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
        curve={curve ?? DEFAULT_CURVE}
        position={position}
        total={TUTORIAL_QUESTIONS.length}
        score={score}
        busy={false}
        onSubmit={answer}
      />
    </div>
  );
}
