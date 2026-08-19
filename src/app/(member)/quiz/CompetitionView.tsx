"use client";

import { useEffect, useState } from "react";
import { api, errorMessage } from "@/lib/api";
import PageHeader from "@/components/PageHeader";
import Icon from "@/components/Icon";
import AttemptQuestion, { type AttemptView } from "./AttemptQuestion";
import AttemptResult from "./AttemptResult";
import StandingsBoard, { type BoardRow } from "./StandingsBoard";
import MyScores from "./MyScores";

interface AttemptState {
  attemptId: string;
  score: number;
  done: boolean;
  total: number;
  position: number;
  question: AttemptView | null;
}

interface AnswerState extends AttemptState {
  isCorrect: boolean;
  points: number;
}

interface Place {
  rank: number;
  total: number;
}

export interface StandingsState {
  running: boolean;
  competitionId: string | null;
  name: string | null;
  meId: string | null;
  today: BoardRow[];
  thisWeek: BoardRow[];
  overall: BoardRow[];
  mine: { today: Place | null; thisWeek: Place | null; overall: Place | null } | null;
}

export default function CompetitionView({
  standings,
  backHref,
  onReloadStandings,
  onSwitch,
}: {
  standings: StandingsState;
  backHref: string;
  onReloadStandings: () => void;
  onSwitch?: () => void;
}) {
  const competitionId = standings.competitionId;
  const [attempt, setAttempt] = useState<AttemptState | null>(null);
  const [result, setResult] = useState<AnswerState | null>(null);
  const [closed, setClosed] = useState("");
  const [showScores, setShowScores] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    api
      .post<AttemptState>("/api/quiz/attempt", { competitionId })
      .then((state) => {
        if (alive) setAttempt(state);
      })
      .catch((e) => {
        if (alive) setClosed(errorMessage(e));
      });
    return () => {
      alive = false;
    };
  }, [competitionId]);

  async function answer(selected: string[]) {
    if (!attempt?.question) return;
    setBusy(true);
    try {
      const next = await api.post<AnswerState>("/api/quiz/attempt/answer", {
        answerId: attempt.question.answerId,
        selectedAnswerIds: selected,
      });
      setResult(next);
    } catch (e) {
      setClosed(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  function continueOn() {
    if (!result) return;
    setAttempt({
      attemptId: result.attemptId,
      score: result.score,
      done: result.done,
      total: result.total,
      position: result.position,
      question: result.question,
    });
    setResult(null);
    if (result.done) onReloadStandings();
  }

  if (result) {
    return (
      <AttemptResult
        isCorrect={result.isCorrect}
        points={result.points}
        score={result.score}
        last={result.done}
        onContinue={continueOn}
      />
    );
  }

  if (attempt && !attempt.done && attempt.question) {
    return (
      <AttemptQuestion
        question={attempt.question}
        position={attempt.position}
        total={attempt.total}
        busy={busy}
        onSubmit={answer}
      />
    );
  }

  return (
    <div className="app-shell">
      <PageHeader title={standings.name ?? "المسابقة الثقافية"} backHref={backHref} />
      <div className="px-5 py-6 pb-10 space-y-5">
        <div className="card p-6 text-center">
          <div className="mb-3 flex justify-center" style={{ color: "var(--mint-500)" }}>
            <Icon name={closed ? "clock" : "check"} size={36} />
          </div>
          <p className="font-semibold" style={{ color: "var(--text-main)" }}>
            {closed || "أنهيت أسئلة الجولة"}
          </p>
          {!closed && attempt && (
            <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
              مجموعك في الجولة {attempt.score}
            </p>
          )}
          <button onClick={() => setShowScores((v) => !v)} className="btn btn-sm text-xs mt-3 ms-2">
            {showScores ? "إخفاء التفاصيل" : "تفاصيل نقاطي"}
          </button>
          {onSwitch && (
            <button onClick={onSwitch} className="btn btn-sm text-xs mt-3">
              تغيير المسابقة
            </button>
          )}
        </div>

        {showScores && competitionId && <MyScores competitionId={competitionId} />}

        <StandingsBoard
          title="ترتيب الجولة"
          rows={standings.today}
          mine={standings.mine?.today ?? null}
          meId={standings.meId}
          empty="لم يشارك أحد في هذه الجولة"
        />
        <StandingsBoard
          title="ترتيب المجموعة"
          rows={standings.thisWeek}
          mine={standings.mine?.thisWeek ?? null}
          meId={standings.meId}
          empty="لا ترتيب لهذه المجموعة بعد"
        />
        <StandingsBoard
          title="الترتيب العام"
          rows={standings.overall}
          mine={standings.mine?.overall ?? null}
          meId={standings.meId}
          empty="لا ترتيب عام بعد"
        />
      </div>
    </div>
  );
}
