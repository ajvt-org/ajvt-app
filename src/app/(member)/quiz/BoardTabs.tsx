"use client";

import type { StandingsBoard } from "./CompetitionView";

export default function BoardTabs({
  boards,
  active,
  onSelect,
}: {
  boards: StandingsBoard[];
  active: string | null;
  onSelect: (id: string) => void;
}) {
  if (boards.length < 2) return null;
  const open = boards.some((b) => b.id === active) ? active : boards[0]?.id;

  return (
    <div className="flex gap-2 overflow-x-auto" role="tablist">
      {boards.map((board) => (
        <button
          key={board.id}
          role="tab"
          aria-selected={board.id === open}
          onClick={() => onSelect(board.id)}
          className="btn btn-sm text-xs font-bold shrink-0"
          style={
            board.id === open
              ? { background: "var(--mint-600)", color: "white" }
              : { background: "white", color: "var(--text-main)" }
          }
        >
          {board.title}
        </button>
      ))}
    </div>
  );
}
