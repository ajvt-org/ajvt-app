"use client";

import type { CSSProperties } from "react";
import Icon, { type IconName } from "@/components/Icon";
import NumericRanges from "@/components/NumericRanges";
import { countedNoun, CORRECT_ANSWERS, POINTS, QUESTIONS } from "@/lib/arabicPlural";

export interface ReviewRow {
  position: number;
  question: string;
  category?: string;
  maxPoints: number;
  isCorrect: boolean | null;
  elapsedMs: number | null;
  points: number;
  percent: number;
  correct: string[];
  chosen: string[];
}

export interface Review {
  rows: ReviewRow[];
  correct: number;
  answered: number;
  total: number;
  score: number;
  possible: number;
  elapsedMs: number;
}

type Outcome = "right" | "wrong" | "missed";

const LOOK: Record<Outcome, { label: string; icon: IconName; tint: string; ink: string }> = {
  right: { label: "إجابة صحيحة", icon: "check", tint: "#e8f5ee", ink: "#1a6b47" },
  wrong: { label: "إجابة خاطئة", icon: "close", tint: "#fdeaea", ink: "#991b1b" },
  missed: { label: "لم تجب", icon: "clock", tint: "#fbf1e8", ink: "#8c4a2a" },
};

function outcomeOf(row: ReviewRow): Outcome {
  if (row.isCorrect === null) return "missed";
  return row.isCorrect ? "right" : "wrong";
}

const seconds = (ms: number | null) => (ms === null ? "—" : `${Math.round(ms / 100) / 10} ث`);

function Tally({ review, voided }: { review: Review; voided: boolean }) {
  const missed = review.total - review.answered;
  const cells: { value: string; label: string; ink: string }[] = [
    { value: voided ? "0" : String(review.score), label: "نقطة", ink: "var(--mint-700)" },
    { value: String(review.correct), label: "صحيحة", ink: LOOK.right.ink },
    { value: String(review.answered - review.correct), label: "خاطئة", ink: LOOK.wrong.ink },
    { value: String(missed), label: "بلا إجابة", ink: LOOK.missed.ink },
  ];
  return (
    <div className="grid grid-cols-4 gap-2">
      {cells.map((cell) => (
        <div
          key={cell.label}
          className="rounded-xl py-2 text-center"
          style={{ background: "var(--mint-50)" }}
        >
          <span className="badge-numeral block text-base font-black" style={{ color: cell.ink }}>
            <NumericRanges>{cell.value}</NumericRanges>
          </span>
          <span className="block text-[10px] font-bold" style={{ color: "var(--text-muted)" }}>
            {cell.label}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function AnswerReview({
  review,
  voided = false,
}: {
  review: Review;
  voided?: boolean;
}) {
  return (
    <div className="space-y-2.5">
      {voided && (
        <p
          className="rounded-xl p-2 text-xs font-bold text-center"
          style={{ background: "#fdeaea", color: "#991b1b" }}
        >
          ألغيت نقاط هذه الجولة
        </p>
      )}

      <Tally review={review} voided={voided} />

      <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
        <NumericRanges>
          {`${countedNoun(review.correct, CORRECT_ANSWERS)} من ${countedNoun(review.total, QUESTIONS)} · ${countedNoun(review.score, POINTS)} من ${review.possible} · ${seconds(review.elapsedMs)}`}
        </NumericRanges>
      </p>

      {review.rows.map((row) => {
        const outcome = outcomeOf(row);
        const look = LOOK[outcome];
        const bar: CSSProperties = { background: look.ink, width: 4 };
        return (
          <div
            key={row.position}
            className="flex overflow-hidden rounded-2xl"
            style={{ background: "var(--surface-2)" }}
          >
            <span style={bar} />
            <div className="flex-1 min-w-0 p-3 space-y-2">
              <div className="flex items-start gap-2">
                <span
                  className="shrink-0 rounded-full inline-flex items-center justify-center"
                  style={{ width: 22, height: 22, background: look.tint, color: look.ink }}
                >
                  <Icon name={look.icon} size={13} />
                </span>
                <p
                  className="flex-1 text-xs font-extrabold"
                  style={{ color: "var(--text-main)", overflowWrap: "anywhere" }}
                >
                  {row.question}
                </p>
                <span
                  className="shrink-0 rounded-full text-[10px] font-black"
                  style={{ padding: "2px 8px", background: look.tint, color: look.ink }}
                >
                  {look.label}
                </span>
              </div>

              <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                إجابتك{" "}
                <span style={{ color: look.ink, fontWeight: 700 }}>
                  {row.chosen.length ? row.chosen.join("، ") : "لم تختر شيئاً"}
                </span>
              </p>

              {outcome !== "right" && row.correct.length > 0 && (
                <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                  الصحيحة{" "}
                  <span style={{ color: LOOK.right.ink, fontWeight: 700 }}>
                    {row.correct.join("، ")}
                  </span>
                </p>
              )}

              <div
                className="flex items-center gap-3 text-[10px] font-bold"
                style={{ color: "var(--text-muted)" }}
              >
                <span className="inline-flex items-center gap-1">
                  <Icon name="clock" size={11} />
                  <NumericRanges>{seconds(row.elapsedMs)}</NumericRanges>
                </span>
                <span className="inline-flex items-center gap-1">
                  <Icon name="star" size={11} filled color="var(--copper-500)" />
                  <NumericRanges>{`${row.points} من ${row.maxPoints}`}</NumericRanges>
                </span>
                {outcome === "right" && row.percent < 100 && (
                  <span style={{ color: LOOK.missed.ink }}>
                    <NumericRanges>{`${row.percent}٪ للسرعة`}</NumericRanges>
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
