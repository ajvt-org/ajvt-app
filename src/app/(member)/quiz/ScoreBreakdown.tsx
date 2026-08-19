"use client";

import NumericRanges from "@/components/NumericRanges";
import ScoreFormula from "./ScoreFormula";
import type { AttemptDetailView, BreakdownRowView } from "./types";
import { countedNoun, POINTS, QUESTIONS } from "@/lib/arabicPlural";

const seconds = (ms: number | null) => (ms === null ? "" : `${Math.round(ms / 100) / 10} ث`);

function status(row: BreakdownRowView) {
  if (row.isCorrect === null) return { label: "متروك", background: "#fef3c7", color: "#92400e" };
  if (row.isCorrect)
    return { label: "صحيحة", background: "var(--mint-100)", color: "var(--mint-700)" };
  return { label: "خاطئة", background: "#fee2e2", color: "#991b1b" };
}

function Row({ row }: { row: BreakdownRowView }) {
  const state = status(row);
  const missed = row.isCorrect !== true;

  return (
    <div className="rounded-lg p-3 space-y-1.5" style={{ background: "var(--surface-2)" }}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-bold flex-1" style={{ color: "var(--text-main)" }}>
          {row.question}
        </p>
        <span
          className="text-xs font-bold px-2 py-0.5 rounded-lg shrink-0"
          style={{ background: state.background, color: state.color }}
        >
          {state.label}
        </span>
      </div>

      {missed && row.correct.length > 0 && (
        <p className="text-xs" style={{ color: "var(--mint-700)" }}>
          الصحيح {row.correct.join("، ")}
        </p>
      )}
      {row.isCorrect === false && row.chosen.length > 0 && (
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          اخترت {row.chosen.join("، ")}
        </p>
      )}

      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
        <NumericRanges>
          {`${row.points} من ${countedNoun(row.maxPoints, POINTS)}${row.elapsedMs === null ? "" : ` · ${seconds(row.elapsedMs)} · ${row.percent}%`}`}
        </NumericRanges>
      </p>
    </div>
  );
}

export default function ScoreBreakdown({ detail }: { detail: AttemptDetailView }) {
  const { breakdown } = detail;

  return (
    <div className="space-y-3">
      <div className="card p-4 space-y-1">
        <p className="text-sm font-bold" style={{ color: "var(--text-main)" }}>
          <NumericRanges>{`الجولة ${detail.round + 1}`}</NumericRanges>
          {detail.category ? ` · ${detail.category}` : ""}
        </p>
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          <NumericRanges>
            {`${breakdown.correct} صحيحة من ${countedNoun(breakdown.total, QUESTIONS)}، المجموع ${breakdown.score} من ${countedNoun(breakdown.possible, POINTS)}، الوقت ${seconds(breakdown.elapsedMs)}`}
          </NumericRanges>
        </p>
      </div>

      <div className="space-y-2">
        {breakdown.rows.map((row) => (
          <Row key={row.position} row={row} />
        ))}
      </div>

      <ScoreFormula curve={detail.curve} boards={detail.boards} />
    </div>
  );
}
