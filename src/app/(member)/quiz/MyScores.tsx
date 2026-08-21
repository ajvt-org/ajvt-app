"use client";

import { useEffect, useState } from "react";
import { api, errorMessage } from "@/lib/api";
import Icon from "@/components/Icon";
import IconLabel from "@/components/IconLabel";
import NumericRanges from "@/components/NumericRanges";
import AnswerReview, { type Review } from "@/components/AnswerReview";
import type { AttemptSummary } from "./types";
import { countedNoun, CORRECT_ANSWERS, QUESTIONS } from "@/lib/arabicPlural";

export default function MyScores({ competitionId }: { competitionId: string }) {
  const [rounds, setRounds] = useState<AttemptSummary[] | null>(null);
  const [error, setError] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const [reviews, setReviews] = useState<Record<string, Review>>({});

  async function toggle(attemptId: string) {
    if (open === attemptId) {
      setOpen(null);
      return;
    }
    setOpen(attemptId);
    if (reviews[attemptId]) return;
    try {
      const data = await api.get<{ detail: { breakdown: Review } }>(
        `/api/quiz/breakdown/${attemptId}`,
      );
      setReviews((held) => ({ ...held, [attemptId]: data.detail.breakdown }));
    } catch (e) {
      setError(errorMessage(e));
      setOpen(null);
    }
  }

  useEffect(() => {
    let alive = true;
    api
      .get<{ rounds: AttemptSummary[] }>(`/api/quiz/breakdown?competition=${competitionId}`)
      .then((data) => {
        if (alive) setRounds(data.rounds);
      })
      .catch((e) => {
        if (alive) setError(errorMessage(e));
      });
    return () => {
      alive = false;
    };
  }, [competitionId]);

  if (error && rounds === null) {
    return (
      <p className="text-xs font-semibold" style={{ color: "#991b1b" }}>
        {error}
      </p>
    );
  }

  return (
    <div className="card p-4 space-y-2">
      <p className="text-sm font-bold" style={{ color: "var(--text-main)" }}>
        <IconLabel name="list">تفاصيل نقاطي</IconLabel>
      </p>
      {error && (
        <p className="text-xs font-semibold" style={{ color: "#991b1b" }}>
          {error}
        </p>
      )}
      {rounds?.length === 0 && (
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          لم تشارك في أي جولة بعد
        </p>
      )}
      {rounds?.map((round) => {
        const reviewable = !round.missed && round.closed && round.attemptId !== null;
        return (
          <div key={round.round}>
            <div
              className="flex items-center gap-3 py-2 text-xs"
              style={{ opacity: round.missed ? 0.55 : 1 }}
            >
              <span
                className="rounded-full shrink-0"
                style={{
                  width: 10,
                  height: 10,
                  background: round.missed ? "transparent" : "var(--mint-600)",
                  border: round.missed ? "2px solid var(--mint-300)" : "none",
                }}
              />
              <span className="text-start flex-1 min-w-0">
                <span className="block font-bold" style={{ color: "var(--text-main)" }}>
                  <NumericRanges>{`الجولة ${round.round + 1}`}</NumericRanges>
                  {round.category ? ` · ${round.category}` : ""}
                </span>
                <span style={{ color: round.voided ? "#991b1b" : "var(--text-muted)" }}>
                  {round.voided ? (
                    "ألغيت نقاط هذه الجولة"
                  ) : round.missed ? (
                    "لم تشارك"
                  ) : (
                    <NumericRanges>
                      {`${countedNoun(round.correct, CORRECT_ANSWERS)} من ${countedNoun(round.total, QUESTIONS)}`}
                    </NumericRanges>
                  )}
                </span>
              </span>
              <span
                className="font-bold"
                style={{
                  color: round.missed || round.voided ? "var(--text-muted)" : "var(--mint-700)",
                }}
              >
                <NumericRanges>{`${round.score}`}</NumericRanges>
              </span>
              {reviewable && (
                <button
                  type="button"
                  onClick={() => toggle(round.attemptId as string)}
                  aria-expanded={open === round.attemptId}
                  aria-label={`تفاصيل الجولة ${round.round + 1}`}
                  className="shrink-0 rounded-full inline-flex items-center justify-center"
                  style={{ width: 26, height: 26, background: "var(--mint-50)" }}
                >
                  <Icon
                    name={open === round.attemptId ? "chevronUp" : "chevronDown"}
                    size={14}
                    color="var(--mint-700)"
                  />
                </button>
              )}
            </div>

            {open === round.attemptId && reviews[round.attemptId as string] && (
              <div className="pb-3">
                <AnswerReview review={reviews[round.attemptId as string]} voided={round.voided} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
