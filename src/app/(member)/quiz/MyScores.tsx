"use client";

import { useEffect, useState } from "react";
import { api, errorMessage } from "@/lib/api";
import IconLabel from "@/components/IconLabel";
import NumericRanges from "@/components/NumericRanges";
import type { AttemptSummary } from "./types";
import { countedNoun, CORRECT_ANSWERS, QUESTIONS } from "@/lib/arabicPlural";

export default function MyScores({ competitionId }: { competitionId: string }) {
  const [rounds, setRounds] = useState<AttemptSummary[] | null>(null);
  const [error, setError] = useState("");

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

  if (error) {
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
      {rounds?.length === 0 && (
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          لم تشارك في أي جولة بعد
        </p>
      )}
      {rounds?.map((round) => (
        <div
          key={round.round}
          className="flex items-center justify-between gap-2 rounded-lg p-2 text-xs"
          style={{ background: "var(--surface-2)", opacity: round.missed ? 0.7 : 1 }}
        >
          <span className="text-start">
            <span className="block font-bold" style={{ color: "var(--text-main)" }}>
              <NumericRanges>{`الجولة ${round.round + 1}`}</NumericRanges>
              {round.category ? ` · ${round.category}` : ""}
            </span>
            <span style={{ color: "var(--text-muted)" }}>
              {round.missed ? (
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
            style={{ color: round.missed ? "var(--text-muted)" : "var(--mint-700)" }}
          >
            <NumericRanges>{`${round.score}`}</NumericRanges>
          </span>
        </div>
      ))}
    </div>
  );
}
