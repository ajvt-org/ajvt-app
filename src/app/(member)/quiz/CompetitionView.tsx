"use client";

import { useState } from "react";
import Image from "next/image";
import { api, errorMessage } from "@/lib/api";
import BackButton from "@/components/BackButton";
import Icon from "@/components/Icon";
import AttemptQuestion, { type AttemptView } from "./AttemptQuestion";
import type { ScoreCurve } from "@/lib/competitionConfig";
import StandingsBoard, { type BoardRow } from "./StandingsBoard";
import BoardTabs from "./BoardTabs";
import MyScores from "./MyScores";
import ScoreFormula from "./ScoreFormula";
import NextRoundCountdown from "./NextRoundCountdown";
import { countedNoun, POINTS, ROUNDS } from "@/lib/arabicPlural";
import { blockLabel } from "@/lib/quizRanking";
import { useNow } from "@/hooks/useNow";

interface AttemptState {
  attemptId: string;
  score?: number;
  done: boolean;
  total: number;
  position: number;
  curve?: ScoreCurve;
  confirm?: boolean;
  question: AttemptView | null;
}

interface Place {
  rank: number;
  total: number;
}

export interface StandingsBoard {
  id: string;
  title: string;
  blockTitle: string;
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
  round: number | null;
  roundCount: number | null;
  state: "before" | "open" | "closed" | "over" | null;
  next: { index: number; opensAt: string } | null;
  closesAt: string | null;
  me: { played: boolean; finished: boolean; score: number | null } | null;
  curve: ScoreCurve | null;
  boards: StandingsBoard[];
}

const URGENT_MS = 30 * 60 * 1000;

function RoundClock({ closesAt, onReached }: { closesAt: string; onReached: () => void }) {
  const now = useNow(1000);
  const urgent = new Date(closesAt).getTime() - now < URGENT_MS;

  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full text-xs font-bold"
      style={{
        padding: "4px 12px",
        background: urgent ? "rgba(196,124,90,0.25)" : "rgba(255,255,255,0.12)",
        color: urgent ? "var(--copper-300)" : "rgba(255,255,255,0.85)",
      }}
    >
      <Icon name="clock" size={13} />
      {urgent ? "يغلق الباب بعد" : "يبقى من الجولة"}
      <NextRoundCountdown
        opensAt={closesAt}
        onReached={onReached}
        color={urgent ? "var(--copper-300)" : "#ffffff"}
        compact
        ariaLabel="الوقت المتبقي لإغلاق الجولة"
      />
    </span>
  );
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
  const [playing, setPlaying] = useState(false);
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

  function land(next: AttemptState) {
    if (next.done) {
      setPlaying(false);
      setAttempt(null);
      onReloadStandings();
      return;
    }
    setAttempt(next);
  }

  async function startRound() {
    if (!competitionId || busy) return;
    setBusy(true);
    setClosed("");
    try {
      const state = await api.post<AttemptState>("/api/quiz/attempt", { competitionId });
      if (state.done) {
        onReloadStandings();
      } else {
        setAttempt(state);
        setPlaying(true);
      }
    } catch (e) {
      setClosed(errorMessage(e));
      onReloadStandings();
    } finally {
      setBusy(false);
    }
  }

  async function skip() {
    if (!competitionId || busy) return;
    setBusy(true);
    try {
      land(await api.post<AttemptState>("/api/quiz/attempt", { competitionId }));
    } catch (e) {
      setPlaying(false);
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
      setPlaying(false);
      setClosed(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  if (playing && attempt && !attempt.done && attempt.question) {
    return (
      <AttemptQuestion
        key={attempt.question.answerId}
        question={attempt.question}
        curve={attempt.curve}
        busy={busy}
        confirm={attempt.confirm ?? true}
        onSubmit={answer}
        onExpire={skip}
      />
    );
  }

  const over = standings.state === "over";
  const roundOpen = standings.state === "open";
  const between = standings.state === "closed" || standings.state === "before";
  const upcoming = between && standings.next ? standings.next : null;
  const finished = roundOpen && standings.me?.finished;
  const closing = roundOpen && standings.closesAt ? standings.closesAt : null;
  const champion = over ? (standings.boards.find((b) => b.wholeRun)?.rows[0] ?? null) : null;

  return (
    <div className="app-shell">
      <div
        className="relative overflow-hidden"
        style={{
          background: "linear-gradient(160deg, var(--mint-900), var(--mint-700))",
          borderRadius: "0 0 28px 28px",
          padding: "16px 20px 56px",
        }}
      >
        <div
          className="absolute rounded-full pointer-events-none"
          style={{
            top: -60,
            insetInlineStart: -50,
            width: 220,
            height: 220,
            background: "radial-gradient(circle, rgba(74,156,126,0.4), rgba(74,156,126,0))",
          }}
        />
        <div className="relative flex items-center gap-3">
          <BackButton onBack={onBack} />
          <Image src="/version-final.png" alt="شعار" width={38} height={38} className="shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-xs" style={{ color: "rgba(255,255,255,0.7)" }}>
              رابطة شباب قرية التاكلالت
            </p>
            <h1 className="text-lg font-black text-white truncate">
              {standings.name ?? "المسابقات الثقافية"}
            </h1>
          </div>
        </div>

        <div className="relative mt-4 flex flex-col items-center gap-2 text-center">
          {over && (
            <>
              <span
                className="rounded-full flex items-center justify-center"
                style={{ width: 56, height: 56, background: "rgba(196,124,90,0.25)" }}
              >
                <Icon name="trophy" size={30} color="var(--copper-300)" />
              </span>
              <p className="text-xl font-black text-white">انتهت المسابقة</p>
              {standings.roundCount !== null && (
                <p className="text-xs" style={{ color: "rgba(255,255,255,0.65)" }}>
                  {countedNoun(standings.roundCount, ROUNDS)}
                </p>
              )}
            </>
          )}

          {upcoming && (
            <>
              <span
                className="flex items-center gap-2 text-sm font-extrabold"
                style={{ color: "var(--mint-300)" }}
              >
                <Icon name="clock" size={16} />
                الجولة القادمة {upcoming.index + 1} من {standings.roundCount}
              </span>
              <NextRoundCountdown
                opensAt={upcoming.opensAt}
                onReached={onReloadStandings}
                color="#ffffff"
              />
              <p className="text-xs" style={{ color: "rgba(255,255,255,0.65)" }}>
                تبدأ{" "}
                {new Date(upcoming.opensAt).toLocaleString("ar", {
                  dateStyle: "short",
                  timeStyle: "short",
                })}
              </p>
            </>
          )}

          {between && !upcoming && closed && <p className="font-semibold text-white">{closed}</p>}

          {finished && (
            <>
              <span
                className="rounded-full flex items-center justify-center"
                style={{ width: 56, height: 56, background: "rgba(255,255,255,0.14)" }}
              >
                <Icon name="check" size={30} className="text-white" />
              </span>
              <p className="text-lg font-black text-white">أنهيت أسئلة الجولة</p>
              {standings.me?.score != null && (
                <p className="text-xs" style={{ color: "rgba(255,255,255,0.65)" }}>
                  مجموعك {countedNoun(standings.me.score, POINTS)} في هذه الجولة
                </p>
              )}
              {standings.next && (
                <span
                  className="inline-flex items-center gap-1.5 rounded-full text-xs font-bold"
                  style={{
                    padding: "4px 12px",
                    background: "rgba(255,255,255,0.12)",
                    color: "rgba(255,255,255,0.85)",
                  }}
                >
                  <Icon name="clock" size={13} />
                  الجولة القادمة بعد
                  <NextRoundCountdown
                    opensAt={standings.next.opensAt}
                    onReached={onReloadStandings}
                    color="#ffffff"
                    compact
                    ariaLabel="الوقت المتبقي للجولة القادمة"
                  />
                </span>
              )}
            </>
          )}

          {roundOpen && !finished && (
            <>
              <p className="text-lg font-black text-white">
                الجولة {(standings.round ?? 0) + 1} مفتوحة الآن
              </p>
              {closing && <RoundClock closesAt={closing} onReached={onReloadStandings} />}
              {closed && (
                <p className="text-xs font-semibold" style={{ color: "var(--copper-300)" }}>
                  {closed}
                </p>
              )}
              <button
                type="button"
                onClick={startRound}
                disabled={busy}
                className="btn mt-1 text-sm font-extrabold text-white"
                style={{
                  width: "auto",
                  padding: "0.7rem 2.2rem",
                  background: "linear-gradient(135deg, var(--copper-500), var(--copper-600))",
                  boxShadow: "0 4px 18px rgba(140,74,42,0.45)",
                }}
              >
                <Icon name="play" size={16} className="icon-inline" />
                {busy ? "..." : standings.me?.played ? "أكمل الجولة" : "ابدأ الجولة"}
              </button>
            </>
          )}
        </div>
      </div>

      <div className="px-5 pb-10 space-y-4 relative" style={{ marginTop: -28 }}>
        {champion && (
          <div
            className="rounded-2xl p-4 flex items-center gap-3.5 relative"
            style={{
              background: "linear-gradient(135deg, #f7e9de, #f1dcc9)",
              boxShadow: "0 6px 24px rgba(140,74,42,0.18)",
            }}
          >
            <Icon name="trophy" size={26} color="var(--copper-600)" />
            <span className="min-w-0 flex-1">
              <span className="block text-xs font-extrabold" style={{ color: "var(--copper-600)" }}>
                بطل الترتيب العام
              </span>
              <span className="block font-black truncate" style={{ color: "var(--text-main)" }}>
                {champion.name}
              </span>
            </span>
            <span className="text-lg font-black" style={{ color: "var(--copper-700)" }}>
              {champion.total}
            </span>
          </div>
        )}

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
                {blockLabel(open.blockRounds, b, standings.roundCount ?? 0, open.blockTitle)}
              </option>
            ))}
          </select>
        )}

        {open && (
          <StandingsBoard
            title={
              open.wholeRun
                ? open.title
                : `${open.title} · ${blockLabel(
                    open.blockRounds,
                    past && block !== null ? block : open.block,
                    standings.roundCount ?? 0,
                    open.blockTitle,
                  )}`
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
