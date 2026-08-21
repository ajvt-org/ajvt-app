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

const REOPENED = "أعيد فتح الأسئلة الفائتة";

export default function ScoresPanel({
  competitionId,
  roundCount,
}: {
  competitionId: string;
  roundCount: number;
}) {
  const [round, setRound] = useState(0);
  const [rows, setRows] = useState<AttemptRow[]>([]);
  const [opened, setOpened] = useState(true);
  const [detail, setDetail] = useState<AttemptDetail | null>(null);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [role, setRole] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let alive = true;
    api
      .get<{ role: string }>("/api/admin/me")
      .then((data) => {
        if (alive) setRole(data.role);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);

  useEffect(() => {
    let alive = true;
    api
      .get<{ attempts: AttemptRow[]; opened: boolean }>(
        `/api/admin/quiz/competitions/${competitionId}/attempts?round=${round}`,
      )
      .then((data) => {
        if (!alive) return;
        setRows(data.attempts);
        setOpened(data.opened);
      })
      .catch(() => {
        if (alive) setRows([]);
      });
    return () => {
      alive = false;
    };
  }, [competitionId, round, reload]);

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

  async function reopen(attemptId: string) {
    setError("");
    setNote("");
    setBusy(attemptId);
    try {
      await api.post(`/api/admin/quiz/attempts/${attemptId}/reopen`, {});
      setNote(REOPENED);
      setReload((n) => n + 1);
      setDetail(null);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(null);
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

      {note && (
        <p className="text-xs font-semibold" style={{ color: "var(--mint-700)" }}>
          {note}
        </p>
      )}

      {rows.length === 0 && (
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          {opened ? "لم يشارك أحد في هذه الجولة" : "لم تبدأ هذه الجولة بعد"}
        </p>
      )}

      <div className="space-y-1">
        {rows.map((row) => (
          <div
            key={row.attemptId}
            className="flex items-center gap-2 rounded-lg p-2 text-xs"
            style={{ background: "var(--surface-2)" }}
          >
            <button
              onClick={() => open(row.attemptId)}
              className="flex-1 flex items-center justify-between text-start"
            >
              <span style={{ color: "var(--text-main)" }}>{row.name}</span>
              <span className="font-bold" style={{ color: "var(--mint-700)" }}>
                {row.score}
              </span>
            </button>
            {role === "SUPER" && (
              <button
                onClick={() => reopen(row.attemptId)}
                disabled={busy === row.attemptId}
                className="shrink-0 rounded-lg px-2 py-1 font-bold disabled:opacity-50"
                style={{ background: "var(--copper-500)", color: "#fff" }}
                title="إعادة فتح الأسئلة الفائتة"
              >
                <IconLabel name="refresh">إعادة فتح</IconLabel>
              </button>
            )}
          </div>
        ))}
      </div>

      {detail && <AttemptBreakdown detail={detail} onClose={() => setDetail(null)} />}
    </div>
  );
}
