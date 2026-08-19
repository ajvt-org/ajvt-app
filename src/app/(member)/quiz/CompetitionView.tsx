"use client";

import { useEffect, useState } from "react";
import { api, errorMessage } from "@/lib/api";
import PageHeader from "@/components/PageHeader";
import Icon from "@/components/Icon";
import AttemptQuestion, { type AttemptView } from "./AttemptQuestion";
import type { ScoreCurve } from "@/lib/competitionConfig";
import StandingsBoard, { type BoardRow } from "./StandingsBoard";
import BoardTabs from "./BoardTabs";
import MyScores from "./MyScores";

interface AttemptState {
  attemptId: string;
  score: number;
  done: boolean;
  total: number;
  position: number;
  curve?: ScoreCurve;
  question: AttemptView | null;
}

interface Place {
  rank: number;
  total: number;
}

export interface StandingsBoard {
  id: string;
  title: string;
  rows: BoardRow[];
  mine: Place | null;
}

export interface StandingsState {
  running: boolean;
  competitionId: string | null;
  name: string | null;
  meId: string | null;
  boards: StandingsBoard[];
}

export default function CompetitionView({
  standings,
  onBack,
  onReloadStandings,
  onTutorial,
}: {
  standings: StandingsState;
  onBack: () => void;
  onReloadStandings: () => void;
  onTutorial?: () => void;
}) {
  const competitionId = standings.competitionId;
  const [attempt, setAttempt] = useState<AttemptState | null>(null);
  const [closed, setClosed] = useState("");
  const [showScores, setShowScores] = useState(false);
  const [board, setBoard] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const open = standings.boards.find((b) => b.id === board) ?? standings.boards[0] ?? null;

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

  async function skip() {
    if (!competitionId || busy) return;
    setBusy(true);
    try {
      setAttempt(await api.post<AttemptState>("/api/quiz/attempt", { competitionId }));
    } catch (e) {
      setClosed(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  async function answer(selected: string[]) {
    if (!attempt?.question) return;
    setBusy(true);
    try {
      const next = await api.post<AttemptState>("/api/quiz/attempt/answer", {
        answerId: attempt.question.answerId,
        selectedAnswerIds: selected,
      });
      setAttempt(next);
      if (next.done) onReloadStandings();
    } catch (e) {
      setClosed(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  if (attempt && !attempt.done && attempt.question) {
    return (
      <AttemptQuestion
        question={attempt.question}
        curve={attempt.curve}
        position={attempt.position}
        total={attempt.total}
        score={attempt.score}
        busy={busy}
        onSubmit={answer}
        onExpire={skip}
      />
    );
  }

  return (
    <div className="app-shell">
      <PageHeader title={standings.name ?? "المسابقات الثقافية"} onBack={onBack} />
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
          {onTutorial && (
            <button onClick={onTutorial} className="btn btn-sm text-xs mt-3 ms-2">
              جولة تجريبية
            </button>
          )}
        </div>

        {showScores && competitionId && <MyScores competitionId={competitionId} />}

        <BoardTabs boards={standings.boards} active={board} onSelect={setBoard} />

        {open && (
          <StandingsBoard
            title={open.title}
            rows={open.rows}
            mine={open.mine}
            meId={standings.meId}
            empty="لا ترتيب بعد"
          />
        )}
      </div>
    </div>
  );
}
