"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import IconLabel from "@/components/IconLabel";
import { quizBankCoverage as texts } from "@/lib/texts";
import { counted } from "@/lib/arabicCount";
import { QUESTION, ROUND } from "@/lib/messages";

interface CoverageBody {
  rounds: { index: number }[];
  bankSize: number;
  plannable: number;
  servedCount: number;
  startedAt: string | null;
}

export default function BankCoverage({ competitionId }: { competitionId: string }) {
  const [body, setBody] = useState<CoverageBody | null>(null);

  const path = `/api/admin/quiz/competitions/${competitionId}/rounds`;

  useEffect(() => {
    let alive = true;
    api
      .get<CoverageBody>(path)
      .then((data) => {
        if (alive) setBody(data);
      })
      .catch(() => {
        if (alive) setBody(null);
      });
    return () => {
      alive = false;
    };
  }, [path]);

  if (!body || body.startedAt) return null;

  const total = body.rounds.length;
  const needed = total * body.servedCount;

  return (
    <div className="card p-4 space-y-2">
      <p className="text-sm font-bold" style={{ color: "var(--text-main)" }}>
        <IconLabel name="question">{texts.title}</IconLabel>
      </p>

      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
        {texts.coverage(
          body.plannable,
          counted(total, ROUND),
          counted(needed, QUESTION),
          body.bankSize,
        )}
      </p>

      {body.plannable < total && (
        <p className="text-xs font-semibold" style={{ color: "#991b1b" }}>
          {texts.short}
        </p>
      )}
    </div>
  );
}
