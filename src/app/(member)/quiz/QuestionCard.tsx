"use client";

import Icon from "@/components/Icon";
import IconLabel from "@/components/IconLabel";
import Countdown from "./Countdown";
import type { AnswerData, AnswerResult, PendingAssignment } from "./types";

const NEUTRAL = {
  border: "1.5px solid var(--mint-200)",
  background: "#fff",
  color: "var(--text-main)",
};
const PICKED = {
  border: "1.5px solid var(--mint-500)",
  background: "var(--mint-100)",
  color: "var(--mint-700)",
};
const RIGHT = { border: "1.5px solid #10b981", background: "#d1fae5", color: "#065f46" };
const WRONG = { border: "1.5px solid #ef4444", background: "#fee2e2", color: "#991b1b" };

function answerStyle(answer: AnswerData, selected: boolean, result?: AnswerResult) {
  if (!result) return selected ? PICKED : NEUTRAL;
  if (result.correctAnswerIds.includes(answer.id)) return RIGHT;
  return selected ? WRONG : NEUTRAL;
}

function Outcome({ result, onContinue }: { result: AnswerResult; onContinue: () => void }) {
  return (
    <div className="space-y-3">
      <div
        className="rounded-xl p-3 text-center font-bold"
        style={{
          background: result.isCorrect ? "#d1fae5" : "#fee2e2",
          color: result.isCorrect ? "#065f46" : "#991b1b",
        }}
      >
        {result.isCorrect ? (
          <IconLabel name="check">إجابة صحيحة! +{result.pointsAwarded} نقطة</IconLabel>
        ) : result.expired ? (
          <IconLabel name="clock">انتهى الوقت</IconLabel>
        ) : (
          <IconLabel name="close">إجابة خاطئة</IconLabel>
        )}
      </div>
      <button className="btn btn-outline" onClick={onContinue}>
        متابعة
      </button>
    </div>
  );
}

export default function QuestionCard({
  assignment,
  selected,
  result,
  submitting,
  revealing,
  windowSeconds,
  timedOut,
  onReveal,
  onExpire,
  onToggle,
  onSubmit,
  onContinue,
}: {
  assignment: PendingAssignment;
  selected: string[];
  result?: AnswerResult;
  submitting: boolean;
  revealing: boolean;
  windowSeconds: number;
  timedOut: boolean;
  onReveal: () => void;
  onExpire: () => void;
  onToggle: (answerId: string) => void;
  onSubmit: () => void;
  onContinue: () => void;
}) {
  const question = assignment.question;
  const revealed = assignment.revealedAt !== null;
  const locked = !!result || timedOut;

  return (
    <div className="card p-5 space-y-4 fade-up delay-1">
      <div className="flex items-center justify-between gap-2">
        <span className="badge" style={{ background: "var(--mint-100)", color: "var(--mint-700)" }}>
          {question.category}
        </span>
        <span
          className="text-xs font-bold flex items-center gap-1"
          style={{ color: "var(--copper-600)" }}
        >
          <Icon name="star" size={13} />
          {question.points} نقطة
        </span>
      </div>

      <p className="font-bold text-base" style={{ color: "var(--text-main)" }}>
        {question.text}
      </p>

      {!revealed ? (
        <>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            اقرأ السؤال، ثم أظهر الخيارات — الوقت يبدأ من تلك اللحظة.
          </p>
          <button className="btn btn-primary" disabled={revealing} onClick={onReveal}>
            {revealing ? "..." : "أظهر الخيارات"}
          </button>
        </>
      ) : (
        <>
          {!result && assignment.revealedAt && !timedOut && (
            <Countdown
              revealedAt={assignment.revealedAt}
              windowSeconds={windowSeconds}
              onExpire={onExpire}
            />
          )}

          {!result && question.correctCount > 1 && (
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              اختر {question.correctCount} إجابات صحيحة
            </p>
          )}

          <div className="space-y-2">
            {question.answers.map((answer) => (
              <button
                key={answer.id}
                type="button"
                disabled={locked}
                onClick={() => onToggle(answer.id)}
                className="w-full text-right px-4 py-3 rounded-xl font-semibold text-sm transition-all"
                style={{
                  ...answerStyle(answer, selected.includes(answer.id), result),
                  cursor: locked ? "default" : "pointer",
                }}
              >
                {answer.text}
              </button>
            ))}
          </div>

          {result ? (
            <Outcome result={result} onContinue={onContinue} />
          ) : (
            <button
              className="btn btn-primary"
              disabled={selected.length === 0 || submitting || timedOut}
              onClick={onSubmit}
            >
              {timedOut ? "انتهى الوقت" : submitting ? "..." : "إرسال الإجابة"}
            </button>
          )}
        </>
      )}
    </div>
  );
}
