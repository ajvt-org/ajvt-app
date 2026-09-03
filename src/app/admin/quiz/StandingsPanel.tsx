"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import IconLabel from "@/components/IconLabel";
import { blockLabel } from "@/lib/quizRanking";
import { quizStandings as texts } from "@/lib/texts";

interface BoardRow {
  rank: number;
  userId: string;
  name: string;
  total: number;
}

interface Board {
  id: string;
  title: string;
  blockTitle: string;
  blockRounds: number;
  wholeRun: boolean;
  block: number;
  blocks: number;
  rows: BoardRow[];
}

interface Standings {
  running: boolean;
  round: number | null;
  roundCount: number | null;
  boards: Board[];
}

export default function StandingsPanel({ competitionId }: { competitionId: string }) {
  const [body, setBody] = useState<Standings | null>(null);
  const [tab, setTab] = useState<string | null>(null);
  const [block, setBlock] = useState<number | null>(null);
  const [past, setPast] = useState<BoardRow[] | null>(null);

  useEffect(() => {
    let alive = true;
    api
      .get<Standings>(`/api/admin/quiz/competitions/${competitionId}/standings`)
      .then((data) => {
        if (alive) setBody(data);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [competitionId]);

  const boards = body?.boards ?? [];
  const openBoard = boards.find((b) => b.id === tab) ?? boards[0] ?? null;
  const rows = past ?? openBoard?.rows ?? [];

  function pickTab(id: string) {
    setTab(id);
    setBlock(null);
    setPast(null);
  }

  async function pickBlock(picked: number) {
    setBlock(picked);
    if (!openBoard || picked === openBoard.block) {
      setPast(null);
      return;
    }
    try {
      const data = await api.get<{ rows: BoardRow[] }>(
        `/api/admin/quiz/competitions/${competitionId}/standings?board=${openBoard.id}&block=${picked}`,
      );
      setPast(data.rows);
    } catch {
      setPast(null);
    }
  }

  return (
    <div className="card p-4 space-y-3">
      <p className="text-sm font-bold" style={{ color: "var(--text-main)" }}>
        <IconLabel name="trophy">{texts.title}</IconLabel>
      </p>

      <div className="flex flex-wrap gap-2">
        {boards.map((board) => (
          <button
            key={board.id}
            onClick={() => pickTab(board.id)}
            className="btn btn-sm"
            style={
              openBoard?.id === board.id
                ? { background: "var(--mint-600)", color: "white" }
                : { background: "var(--surface-2)" }
            }
          >
            {board.title}
          </button>
        ))}
      </div>

      {openBoard && openBoard.blocks > 1 && (
        <select
          aria-label={texts.block}
          className="input input-sm"
          value={block ?? openBoard.block}
          onChange={(e) => pickBlock(Number(e.target.value))}
        >
          {Array.from({ length: openBoard.blocks }, (_, b) => (
            <option key={b} value={b}>
              {blockLabel(openBoard.blockRounds, b, body?.roundCount ?? 0, openBoard.blockTitle)}
            </option>
          ))}
        </select>
      )}

      {rows.length === 0 && (
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          {texts.empty}
        </p>
      )}

      <div className="space-y-1">
        {rows.map((row) => (
          <div
            key={row.userId}
            className="flex items-center justify-between rounded-lg p-2 text-xs"
            style={{ background: "var(--surface-2)" }}
          >
            <span style={{ color: "var(--text-main)" }}>
              {row.rank} · {row.name}
            </span>
            <span className="font-bold" style={{ color: "var(--mint-700)" }}>
              {row.total}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
