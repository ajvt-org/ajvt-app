"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import Icon from "@/components/Icon";
import IconLabel from "@/components/IconLabel";

interface BoardRow {
  rank: number;
  userId: string;
  name: string;
  total: number;
}

interface Board {
  id: string;
  title: string;
  rows: BoardRow[];
}

interface Standings {
  running: boolean;
  round: number | null;
  boards: Board[];
}

export default function StandingsPanel({ competitionId }: { competitionId: string }) {
  const [body, setBody] = useState<Standings | null>(null);
  const [tab, setTab] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

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

  return (
    <div className="card overflow-hidden">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3"
      >
        <p className="text-sm font-bold" style={{ color: "var(--text-main)" }}>
          <IconLabel name="trophy">ترتيب هذه المسابقة</IconLabel>
        </p>
        <Icon name={open ? "chevronDown" : "chevronLeft"} size={14} />
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3">
          <div className="flex flex-wrap gap-2">
            {boards.map((board) => (
              <button
                key={board.id}
                onClick={() => setTab(board.id)}
                className="btn btn-sm text-xs"
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

          {(!openBoard || openBoard.rows.length === 0) && (
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              لا ترتيب بعد
            </p>
          )}

          <div className="space-y-1">
            {openBoard?.rows.map((row) => (
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
      )}
    </div>
  );
}
