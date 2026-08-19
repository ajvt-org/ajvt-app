"use client";

import { useEffect, useState } from "react";
import { api, errorMessage } from "@/lib/api";
import IconLabel from "@/components/IconLabel";
import NumericRanges from "@/components/NumericRanges";
import ScoreBreakdown from "./ScoreBreakdown";
import type { AttemptDetailView, AttemptSummary } from "./types";

export default function MyScores({ competitionId }: { competitionId: string }) {
  const [rounds, setRounds] = useState<AttemptSummary[] | null>(null);
  const [detail, setDetail] = useState<AttemptDetailView | null>(null);
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

  async function open(attemptId: string) {
    try {
      const data = await api.get<{ detail: AttemptDetailView }>(`/api/quiz/breakdown/${attemptId}`);
      setDetail(data.detail);
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  if (error) {
    return (
      <p className="text-xs font-semibold" style={{ color: "#991b1b" }}>
        {error}
      </p>
    );
  }

  if (detail) {
    return (
      <div className="space-y-3">
        <button onClick={() => setDetail(null)} className="btn btn-sm text-xs">
          <IconLabel name="chevronRight">كل الجولات</IconLabel>
        </button>
        <ScoreBreakdown detail={detail} />
      </div>
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
      {rounds?.map((round) =>
        round.attemptId ? (
          <button
            key={round.round}
            onClick={() => open(round.attemptId as string)}
            className="w-full flex items-center justify-between gap-2 rounded-lg p-2 text-xs"
            style={{ background: "var(--surface-2)" }}
          >
            <span className="text-start">
              <span className="block font-bold" style={{ color: "var(--text-main)" }}>
                <NumericRanges>{`الجولة ${round.round + 1}`}</NumericRanges>
                {round.category ? ` · ${round.category}` : ""}
              </span>
              <span style={{ color: "var(--text-muted)" }}>
                <NumericRanges>{`${round.correct} صحيحة من ${round.total}`}</NumericRanges>
              </span>
            </span>
            <span className="font-bold" style={{ color: "var(--mint-700)" }}>
              <NumericRanges>{`${round.score}`}</NumericRanges>
            </span>
          </button>
        ) : (
          <div
            key={round.round}
            className="flex items-center justify-between gap-2 rounded-lg p-2 text-xs"
            style={{ background: "var(--surface-2)", opacity: 0.7 }}
          >
            <span className="text-start">
              <span className="block font-bold" style={{ color: "var(--text-main)" }}>
                <NumericRanges>{`الجولة ${round.round + 1}`}</NumericRanges>
                {round.category ? ` · ${round.category}` : ""}
              </span>
              <span style={{ color: "var(--text-muted)" }}>لم تشارك</span>
            </span>
            <span className="font-bold" style={{ color: "var(--text-muted)" }}>
              <NumericRanges>0</NumericRanges>
            </span>
          </div>
        ),
      )}
    </div>
  );
}
