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
import ScoreFormula from "./ScoreFormula";
import { countedNoun, POINTS } from "@/lib/arabicPlural";
import { blockLabel } from "@/lib/quizRanking";

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
  blockRounds: number;
  counting: number;
  wholeRun: boolean;
  block: number;
  blocks: number;
  rows: BoardRow[];
  mine: Place | null;
}

export interface StandingsState {
  running: boolean;
  competitionId: string | null;
  name: string | null;
  meId: string | null;
  roundCount: number | null;
  state: "before" | "open" | "closed" | "over" | null;
  next: { index: number; opensAt: string } | null;
  curve: ScoreCurve | null;
  boards: StandingsBoard[];
}

export default function CompetitionView({
  standings,
  onBack,
  onReloadStandings,
}: {
  standings: StandingsState;
  onBack: () => void;
  onReloadStandings: () => void;
}) {
  const competitionId = standings.competitionId;
  const [attempt, setAttempt] = useState<AttemptState | null>(null);
  const [closed, setClosed] = useState("");
  const [tab, setTab] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [block, setBlock] = useState<number | null>(null);
  const [past, setPast] = useState<{ rows: BoardRow[]; mine: Place | null } | null>(null);

  const tabs = standings.boards.map((b) => ({ id: b.id, title: b.title }));
  const openTab = tabs.some((t) => t.id === tab) ? (tab as string) : (tabs[0]?.id ?? "");
  const open = standings.boards.find((b) => b.id === openTab) ?? null;

  function pickTab(id: string) {
    setTab(id);
    setBlock(null);
    setPast(null);
  }

  async function pickBlock(picked: number) {
    setBlock(picked);
    if (!open || picked === open.block) {
      setPast(null);
      return;
    }
    try {
      setPast(
        await api.get(
          `/api/quiz/standings?competition=${competitionId}&board=${open.id}&block=${picked}`,
        ),
      );
    } catch {
      setPast(null);
    }
  }

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

  function land(next: AttemptState) {
    if (next.done) {
      onReloadStandings();
      onBack();
      return;
    }
    setAttempt(next);
  }

  async function skip() {
    if (!competitionId || busy) return;
    setBusy(true);
    try {
      land(await api.post<AttemptState>("/api/quiz/attempt", { competitionId }));
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
      land(
        await api.post<AttemptState>("/api/quiz/attempt/answer", {
          answerId: attempt.question.answerId,
          selectedAnswerIds: selected,
        }),
      );
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
        busy={busy}
        onSubmit={answer}
        onExpire={skip}
      />
    );
  }

  const over = standings.state === "over";
  const between = standings.state === "closed" || standings.state === "before";
  const upcoming = closed && between && standings.next ? standings.next : null;

  return (
    <div className="app-shell">
      <PageHeader title={standings.name ?? "المسابقات الثقافية"} onBack={onBack} />
      <div className="px-5 py-6 pb-10 space-y-5">
        <div className="card p-6 text-center">
          <div className="mb-3 flex justify-center" style={{ color: "var(--mint-500)" }}>
            <Icon name={closed ? (over ? "trophy" : "clock") : "check"} size={36} />
          </div>
          {!closed && (
            <p className="font-semibold" style={{ color: "var(--text-main)" }}>
              أنهيت أسئلة الجولة
            </p>
          )}
          {!closed && attempt && (
            <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
              مجموعك {countedNoun(attempt.score, POINTS)} في هذه الجولة
            </p>
          )}
          {closed && over && (
            <p className="font-semibold" style={{ color: "var(--text-main)" }}>
              انتهت المسابقة
            </p>
          )}
          {upcoming && (
            <>
              <p className="font-semibold" style={{ color: "var(--text-main)" }}>
                الجولة القادمة {upcoming.index + 1} من {standings.roundCount}
              </p>
              <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
                تبدأ{" "}
                {new Date(upcoming.opensAt).toLocaleString("ar", {
                  dateStyle: "short",
                  timeStyle: "short",
                })}
              </p>
            </>
          )}
          {closed && !over && !upcoming && (
            <p className="font-semibold" style={{ color: "var(--text-main)" }}>
              {closed}
            </p>
          )}
        </div>

        <BoardTabs tabs={tabs} active={openTab} onSelect={pickTab} />

        {open && open.blocks > 1 && (
          <select
            aria-label="فترة الترتيب"
            className="input input-sm"
            value={block ?? open.block}
            onChange={(e) => pickBlock(Number(e.target.value))}
          >
            {Array.from({ length: open.blocks }, (_, b) => (
              <option key={b} value={b}>
                {blockLabel(open.blockRounds, b, standings.roundCount ?? 0)}
              </option>
            ))}
          </select>
        )}

        {open && (
          <StandingsBoard
            title={
              past && block !== null
                ? `${open.title} · ${blockLabel(open.blockRounds, block, standings.roundCount ?? 0)}`
                : open.title
            }
            rows={past ? past.rows : open.rows}
            mine={past ? past.mine : open.mine}
            meId={standings.meId}
            empty="لا ترتيب بعد"
          />
        )}

        {competitionId && <MyScores competitionId={competitionId} />}

        {standings.curve && <ScoreFormula curve={standings.curve} boards={standings.boards} />}
      </div>
    </div>
  );
}
