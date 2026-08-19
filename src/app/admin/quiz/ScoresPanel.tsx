"use client";

import { useEffect, useState } from "react";
import { api, errorMessage } from "@/lib/api";
import IconLabel from "@/components/IconLabel";
import AttemptBreakdown, { type AttemptDetail } from "./AttemptBreakdown";

interface AttemptRow {
  attemptId: string;
  name: string;
  score: number;
  finishedAt: string | null;
}

export default function ScoresPanel({
  competitionId,
  roundCount,
}: {
  competitionId: string;
  roundCount: number;
}) {
  const [round, setRound] = useState(0);
  const [rows, setRows] = useState<AttemptRow[]>([]);
  const [detail, setDetail] = useState<AttemptDetail | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    api
      .get<{ attempts: AttemptRow[] }>(
        `/api/admin/quiz/competitions/${competitionId}/attempts?round=${round}`,
      )
      .then((data) => {
        if (alive) setRows(data.attempts);
      })
      .catch(() => {
        if (alive) setRows([]);
      });
    return () => {
      alive = false;
    };
  }, [competitionId, round]);

  async function open(attemptId: string) {
    setError("");
    try {
      const data = await api.get<{ detail: AttemptDetail }>(
        `/api/admin/quiz/attempts/${attemptId}`,
      );
      setDetail(data.detail);
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  return (
    <div className="card p-4 space-y-3">
      <p className="text-sm font-bold" style={{ color: "var(--text-main)" }}>
        <IconLabel name="chart">نقاط المشاركين</IconLabel>
      </p>

      <label className="block text-xs font-bold" htmlFor="s-round">
        الجولة
      </label>
      <select
        id="s-round"
        value={round}
        onChange={(e) => {
          setRound(Number(e.target.value));
          setDetail(null);
        }}
        className="input input-sm"
      >
        {Array.from({ length: roundCount }, (_, i) => (
          <option key={i} value={i}>
            {i + 1}
          </option>
        ))}
      </select>

      {error && (
        <p className="text-xs font-semibold" style={{ color: "#991b1b" }}>
          {error}
        </p>
      )}

      {rows.length === 0 && (
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          لم يشارك أحد في هذه الجولة
        </p>
      )}

      <div className="space-y-1">
        {rows.map((row) => (
          <button
            key={row.attemptId}
            onClick={() => open(row.attemptId)}
            className="w-full flex items-center justify-between rounded-lg p-2 text-xs"
            style={{ background: "var(--surface-2)" }}
          >
            <span style={{ color: "var(--text-main)" }}>{row.name}</span>
            <span className="font-bold" style={{ color: "var(--mint-700)" }}>
              {row.score}
            </span>
          </button>
        ))}
      </div>

      {detail && <AttemptBreakdown detail={detail} onClose={() => setDetail(null)} />}
    </div>
  );
}
