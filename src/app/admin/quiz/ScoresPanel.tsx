"use client";

import { useEffect, useState } from "react";
import { api, errorMessage } from "@/lib/api";
import IconLabel from "@/components/IconLabel";
import ScoreRow from "./ScoreRow";
import { type AttemptDetail } from "./AttemptBreakdown";
import { hasFullAccess } from "@/lib/adminRoles";
import { quizScores } from "@/lib/texts";
import type { AttemptRow } from "./scoreTypes";

const REOPENED = quizScores.reopened;

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
    if (detail?.attemptId === attemptId) {
      setDetail(null);
      return;
    }
    try {
      const data = await api.get<{ detail: AttemptDetail }>(
        `/api/admin/quiz/attempts/${attemptId}`,
      );
      setDetail(data.detail);
    } catch (e) {
      setError(errorMessage(e));
    }
  }

  const reopen = (attemptId: string) =>
    act(attemptId, () => api.post(`/api/admin/quiz/attempts/${attemptId}/reopen`, {}), REOPENED);

  async function act(attemptId: string, run: () => Promise<unknown>, done: string) {
    setError("");
    setNote("");
    setBusy(attemptId);
    try {
      await run();
      setNote(done);
      setReload((n) => n + 1);
      setDetail(null);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  const voidRound = (row: AttemptRow) =>
    act(
      row.attemptId,
      () => api.post(`/api/admin/quiz/attempts/${row.attemptId}/void`, { voided: !row.voided }),
      row.voided ? quizScores.roundRestored : quizScores.roundVoided,
    );

  const voidEverything = (row: AttemptRow) =>
    act(
      row.attemptId,
      () =>
        api.post(`/api/admin/quiz/competitions/${competitionId}/void`, {
          userId: row.userId,
          voided: !row.voided,
        }),
      row.voided ? quizScores.allRoundsRestored : quizScores.allRoundsVoided,
    );

  return (
    <div className="card p-4 space-y-3">
      <p className="text-sm font-bold" style={{ color: "var(--text-main)" }}>
        <IconLabel name="chart">{quizScores.title}</IconLabel>
      </p>

      <label className="block text-xs font-bold" htmlFor="s-round">
        {quizScores.round}
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
          {opened ? quizScores.nobodyPlayed : quizScores.notStarted}
        </p>
      )}

      <div className="space-y-1">
        {rows.map((row) => (
          <ScoreRow
            key={row.attemptId}
            row={row}
            detail={detail?.attemptId === row.attemptId ? detail : null}
            busy={busy === row.attemptId}
            canAct={hasFullAccess(role)}
            onOpen={() => open(row.attemptId)}
            onClose={() => setDetail(null)}
            onReopen={() => reopen(row.attemptId)}
            onVoidRound={() => voidRound(row)}
            onVoidAll={() => voidEverything(row)}
          />
        ))}
      </div>
    </div>
  );
}
