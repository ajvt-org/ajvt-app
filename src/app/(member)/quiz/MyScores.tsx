"use client";

import { useEffect, useState } from "react";
import { api, errorMessage } from "@/lib/api";
import IconLabel from "@/components/IconLabel";
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
      {rounds?.map((round) => (
        <button
          key={round.attemptId}
          onClick={() => open(round.attemptId)}
          className="w-full flex items-center justify-between rounded-lg p-2 text-xs"
          style={{ background: "var(--surface-2)" }}
        >
          <span style={{ color: "var(--text-main)" }}>
            الجولة {round.round + 1}
            {round.category ? ` · ${round.category}` : ""}
          </span>
          <span className="font-bold" style={{ color: "var(--mint-700)" }}>
            {round.score}
          </span>
        </button>
      ))}
    </div>
  );
}
