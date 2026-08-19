"use client";

import Icon from "@/components/Icon";
import ScoreFormula from "./ScoreFormula";
import type { AttemptDetailView } from "./types";

const seconds = (ms: number | null) => (ms === null ? "" : `${Math.round(ms / 100) / 10} ث`);

export default function ScoreBreakdown({ detail }: { detail: AttemptDetailView }) {
  const { breakdown } = detail;

  return (
    <div className="space-y-3">
      <div className="card p-4 space-y-1">
        <p className="text-sm font-bold" style={{ color: "var(--text-main)" }}>
          الجولة {detail.round + 1}
          {detail.category ? ` · ${detail.category}` : ""}
        </p>
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          {breakdown.correct} صحيحة من {breakdown.total} سؤالاً، المجموع {breakdown.score} من{" "}
          {breakdown.possible} نقطة، الوقت {seconds(breakdown.elapsedMs)}
        </p>
      </div>

      <div className="card p-2 overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr style={{ color: "var(--text-muted)" }}>
              <th className="p-2 text-start">السؤال</th>
              <th className="p-2">النقاط</th>
              <th className="p-2">الوقت</th>
              <th className="p-2">النسبة</th>
              <th className="p-2">المحصلة</th>
            </tr>
          </thead>
          <tbody>
            {breakdown.rows.map((row) => (
              <tr key={row.position} style={{ color: "var(--text-main)" }}>
                <td className="p-2">
                  <span className="flex items-center gap-1">
                    <Icon
                      name={row.isCorrect ? "check" : row.isCorrect === null ? "clock" : "close"}
                      size={12}
                    />
                    <span className="truncate">{row.question}</span>
                  </span>
                </td>
                <td className="p-2 text-center">{row.maxPoints}</td>
                <td className="p-2 text-center">{seconds(row.elapsedMs)}</td>
                <td className="p-2 text-center">{row.percent}%</td>
                <td className="p-2 text-center font-bold">{row.points}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ScoreFormula curve={detail.curve} boards={detail.boards} />
    </div>
  );
}
