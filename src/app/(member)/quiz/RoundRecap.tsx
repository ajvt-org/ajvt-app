"use client";

import { useEffect, useState } from "react";
import { api, errorMessage } from "@/lib/api";
import Icon from "@/components/Icon";
import IconLabel from "@/components/IconLabel";
import NumericRanges from "@/components/NumericRanges";
import { quizRecap as texts } from "@/lib/texts";
import type { RecapQuestion, RoundRecapData } from "./types";

function Rate({ question }: { question: RecapQuestion }) {
  if (question.rate === null) {
    return (
      <span className="text-[11px] font-bold" style={{ color: "var(--text-muted)" }}>
        {texts.noAnswers}
      </span>
    );
  }
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full text-[11px] font-bold"
      style={{
        padding: "3px 10px",
        background: question.rate >= 50 ? "#e8f5ee" : "#fbf1e8",
        color: question.rate >= 50 ? "#1a6b47" : "#8c4a2a",
      }}
    >
      <NumericRanges>{texts.rate(question.rate)}</NumericRanges>
      <span style={{ color: "var(--text-muted)" }}>
        <NumericRanges>{texts.rightOfAnswered(question.right, question.answered)}</NumericRanges>
      </span>
    </span>
  );
}

function Question({ question }: { question: RecapQuestion }) {
  return (
    <div className="rounded-xl p-3 space-y-1.5" style={{ background: "var(--mint-50)" }}>
      <p className="text-xs font-bold" style={{ color: "var(--text-main)" }}>
        {question.text}
      </p>
      <p className="text-[11px]" style={{ color: "var(--mint-700)" }}>
        <span className="font-bold">
          {question.correct.length > 1 ? texts.manyAnswers : texts.oneAnswer}
        </span>{" "}
        {question.correct.join(" · ")}
      </p>
      <Rate question={question} />
    </div>
  );
}

export default function RoundRecap({ competitionId }: { competitionId: string }) {
  const [recap, setRecap] = useState<RoundRecapData | null>(null);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    api
      .get<{ recap: RoundRecapData | null }>(`/api/quiz/recap?competition=${competitionId}`)
      .then((data) => {
        if (alive) setRecap(data.recap);
      })
      .catch((e) => {
        if (alive) setError(errorMessage(e));
      });
    return () => {
      alive = false;
    };
  }, [competitionId]);

  if (error) {
    return (
      <p className="text-xs font-semibold" style={{ color: "#991b1b" }}>
        {error}
      </p>
    );
  }
  if (!recap || recap.questions.length === 0) return null;

  return (
    <div className="card p-4 space-y-2">
      <button
        type="button"
        onClick={() => setOpen((shown) => !shown)}
        aria-expanded={open}
        className="w-full flex items-center gap-2 text-start"
      >
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold" style={{ color: "var(--text-main)" }}>
            <IconLabel name="quiz">{texts.title}</IconLabel>
          </span>
          <span className="block text-xs" style={{ color: "var(--text-muted)" }}>
            <NumericRanges>{texts.round(recap.round + 1)}</NumericRanges>
            {recap.category ? ` · ${recap.category}` : ""}
          </span>
        </span>
        <span
          className="shrink-0 rounded-full inline-flex items-center justify-center"
          style={{ width: 26, height: 26, background: "var(--mint-50)" }}
          aria-label={open ? texts.hide : texts.show}
        >
          <Icon name={open ? "chevronUp" : "chevronDown"} size={14} color="var(--mint-700)" />
        </span>
      </button>

      {open && (
        <div className="space-y-2">
          {recap.questions.map((question) => (
            <Question key={question.id} question={question} />
          ))}
        </div>
      )}
    </div>
  );
}
