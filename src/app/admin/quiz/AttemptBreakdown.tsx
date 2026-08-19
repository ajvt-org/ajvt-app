"use client";

import IconLabel from "@/components/IconLabel";
import { countedNoun, POINTS } from "@/lib/arabicPlural";

export interface AttemptDetail {
  attemptId: string;
  name: string;
  round: number;
  category: string | null;
  breakdown: {
    rows: {
      position: number;
      question: string;
      maxPoints: number;
      isCorrect: boolean | null;
      elapsedMs: number | null;
      points: number;
      percent: number;
    }[];
    correct: number;
    answered: number;
    total: number;
    score: number;
    possible: number;
    elapsedMs: number;
  };
}

const seconds = (ms: number | null) => (ms === null ? "" : `${Math.round(ms / 100) / 10} ث`);

export default function AttemptBreakdown({
  detail,
  onClose,
}: {
  detail: AttemptDetail;
  onClose: () => void;
}) {
  const { breakdown } = detail;

  return (
    <div className="rounded-lg p-3 space-y-2" style={{ background: "var(--surface-2)" }}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-bold" style={{ color: "var(--text-main)" }}>
          {detail.name} · الجولة {detail.round + 1}
          {detail.category ? ` · ${detail.category}` : ""}
        </p>
        <button onClick={onClose} className="btn btn-sm text-xs">
          <IconLabel name="close">إغلاق</IconLabel>
        </button>
      </div>

      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
        {breakdown.correct} صحيحة من {breakdown.total}، المجموع {breakdown.score} من{" "}
        {countedNoun(breakdown.possible, POINTS)}، الوقت {seconds(breakdown.elapsedMs)}
      </p>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr style={{ color: "var(--text-muted)" }}>
              <th className="p-1 text-start">السؤال</th>
              <th className="p-1">النقاط</th>
              <th className="p-1">الوقت</th>
              <th className="p-1">النسبة</th>
              <th className="p-1">المحصلة</th>
            </tr>
          </thead>
          <tbody>
            {breakdown.rows.map((row) => (
              <tr key={row.position} style={{ color: "var(--text-main)" }}>
                <td className="p-1">{row.question}</td>
                <td className="p-1 text-center">{row.maxPoints}</td>
                <td className="p-1 text-center">{seconds(row.elapsedMs)}</td>
                <td className="p-1 text-center">{row.percent}%</td>
                <td className="p-1 text-center font-bold">{row.points}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
