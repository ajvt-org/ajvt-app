"use client";

import type { CSSProperties } from "react";
import Image from "next/image";
import BackButton from "@/components/BackButton";
import Icon, { type IconName } from "@/components/Icon";
import NumericRanges from "@/components/NumericRanges";
import NextRoundCountdown from "./NextRoundCountdown";
import type { CompetitionState, RunningCompetition } from "./types";
import { countedNoun, ROUNDS } from "@/lib/arabicPlural";

const STATE_LABEL: Record<CompetitionState, string> = {
  before: "لم تنطلق بعد",
  open: "جولة مفتوحة الآن",
  closed: "بين جولتين",
  over: "انتهت",
};

const STATE_ICON: Record<CompetitionState, IconName> = {
  before: "hourglass",
  open: "play",
  closed: "clock",
  over: "trophy",
};

const TILE_STYLE: Record<CompetitionState, CSSProperties> = {
  open: {
    background: "linear-gradient(135deg, var(--mint-600), var(--mint-700))",
    color: "#ffffff",
    boxShadow: "0 4px 12px rgba(38,92,73,0.3)",
  },
  closed: { background: "var(--mint-100)", color: "var(--mint-600)" },
  over: { background: "var(--mint-50)", color: "var(--text-muted)" },
  before: {
    background: "var(--mint-50)",
    border: "1.5px dashed var(--mint-200)",
    color: "var(--text-muted)",
  },
};

const CHIP_STYLE: Record<CompetitionState, CSSProperties> = {
  open: {
    background: "linear-gradient(135deg, var(--mint-600), var(--mint-700))",
    color: "#ffffff",
  },
  closed: { background: "var(--mint-100)", color: "var(--mint-700)" },
  over: { background: "var(--mint-50)", color: "var(--text-muted)" },
  before: { border: "1px solid var(--mint-200)", color: "var(--text-muted)" },
};

function CompetitionCard({
  competition,
  onPick,
  onStarted,
}: {
  competition: RunningCompetition;
  onPick: (id: string) => void;
  onStarted?: () => void;
}) {
  const { state } = competition;
  const playable = state !== "before";
  const share =
    competition.roundCount > 0
      ? Math.min(100, (competition.passedRounds / competition.roundCount) * 100)
      : 0;
  return (
    <button
      onClick={() => onPick(competition.id)}
      disabled={!playable}
      className="card p-4 w-full text-start flex items-center gap-3"
      style={state === "open" ? { boxShadow: "0 6px 24px rgba(26,63,51,0.12)" } : undefined}
    >
      <span
        className="rounded-2xl flex items-center justify-center shrink-0"
        style={{ width: 48, height: 48, opacity: playable ? undefined : 0.6, ...TILE_STYLE[state] }}
      >
        <Icon name={STATE_ICON[state]} size={22} />
      </span>
      <span className="flex-1 min-w-0" style={{ opacity: playable ? undefined : 0.6 }}>
        <span className="flex items-start gap-2">
          <span
            className="flex-1 min-w-0 font-black line-clamp-2"
            style={{ color: "var(--text-main)", fontSize: 15 }}
          >
            {competition.name}
          </span>
          {competition.visibility === "PRIVATE" && (
            <Icon name="lock" size={12} color="var(--text-muted)" className="shrink-0 mt-1" />
          )}
          <span
            className="shrink-0 rounded-full font-black"
            style={{ padding: "1px 10px", fontSize: 10, marginTop: 2, ...CHIP_STYLE[state] }}
          >
            {STATE_LABEL[state]}
          </span>
        </span>
        {state === "before" ? (
          <span
            className="flex items-center gap-1.5 mt-1.5 text-xs font-bold"
            style={{ color: "var(--copper-600)" }}
          >
            <Icon name="clock" size={13} className="shrink-0" />
            تنطلق بعد
            <NextRoundCountdown
              opensAt={competition.startsAt}
              onReached={onStarted}
              color="var(--copper-600)"
              compact
              ariaLabel="الوقت المتبقي لانطلاق المسابقة"
            />
          </span>
        ) : (
          <span className="flex items-center gap-2 mt-1.5">
            <span
              className="flex-1 block rounded-full overflow-hidden"
              style={{ height: 5, background: "#eef6f1" }}
            >
              <span
                className="block h-full rounded-full"
                style={{
                  width: `${share}%`,
                  background:
                    state === "over"
                      ? "var(--mint-200)"
                      : "linear-gradient(90deg, var(--mint-600), var(--mint-500))",
                }}
              />
            </span>
            <span className="shrink-0 text-xs tabular-nums" style={{ color: "var(--text-muted)" }}>
              <NumericRanges>
                {`${competition.passedRounds} من ${countedNoun(competition.roundCount, ROUNDS)}`}
              </NumericRanges>
            </span>
          </span>
        )}
      </span>
      {playable && (
        <span
          className="shrink-0 flex items-center justify-center gap-1.5 rounded-full"
          style={{ padding: "6px 11px", minWidth: 58, background: "var(--mint-50)" }}
        >
          <Icon name="star" size={13} filled color="var(--copper-500)" className="shrink-0" />
          <span
            className="badge-numeral text-sm font-black tabular-nums"
            style={{ color: "var(--mint-700)" }}
          >
            <NumericRanges>{`${competition.myScore}`}</NumericRanges>
          </span>
        </span>
      )}
    </button>
  );
}

export default function QuizPicker({
  competitions,
  backHref,
  onPick,
  onTutorial,
  onStarted,
}: {
  competitions: RunningCompetition[];
  backHref: string;
  onPick: (id: string) => void;
  onTutorial?: () => void;
  onStarted?: () => void;
}) {
  return (
    <div className="app-shell">
      <div
        className="relative overflow-hidden"
        style={{
          background: "linear-gradient(160deg, var(--mint-900), var(--mint-700))",
          borderRadius: "0 0 28px 28px",
          padding: "16px 20px 44px",
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
          <BackButton href={backHref} />
          <Image src="/version-final.png" alt="شعار" width={38} height={38} className="shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="text-xs" style={{ color: "rgba(255,255,255,0.7)" }}>
              رابطة شباب قرية التاكلالت
            </p>
            <h1 className="text-lg font-black text-white truncate">المسابقات الثقافية</h1>
          </div>
        </div>
      </div>
      <div className="px-5 pb-10 space-y-3 relative" style={{ marginTop: -24 }}>
        {competitions.length === 0 && (
          <div className="card p-6 text-center space-y-2">
            <div className="flex justify-center" style={{ color: "var(--mint-500)" }}>
              <Icon name="trophy" size={36} />
            </div>
            <p className="font-semibold" style={{ color: "var(--text-main)" }}>
              لا توجد مسابقة تشارك فيها الآن
            </p>
          </div>
        )}

        {competitions.map((competition) => (
          <CompetitionCard
            key={competition.id}
            competition={competition}
            onPick={onPick}
            onStarted={onStarted}
          />
        ))}

        {onTutorial && (
          <>
            <div className="flex items-center gap-3 pt-2.5">
              <span
                className="flex-1"
                style={{
                  height: 1.5,
                  background: "linear-gradient(to left, #ecd7c5, rgba(236,215,197,0))",
                }}
              />
              <span
                className="flex items-center gap-1.5 text-xs font-black"
                style={{ color: "var(--copper-600)" }}
              >
                <Icon name="sparkle" size={14} />
                ركن التجربة
              </span>
              <span
                className="flex-1"
                style={{
                  height: 1.5,
                  background: "linear-gradient(to right, #ecd7c5, rgba(236,215,197,0))",
                }}
              />
            </div>
            <div
              className="relative overflow-hidden p-4"
              style={{
                background: "linear-gradient(150deg, #fffdfb, #fbf1e8)",
                border: "1.5px dashed #d9a583",
                borderRadius: 20,
              }}
            >
              <div
                className="absolute rounded-full"
                style={{
                  insetInlineStart: -22,
                  top: -22,
                  width: 90,
                  height: 90,
                  background: "#f7e9de",
                  opacity: 0.7,
                }}
              />
              <div className="relative flex items-center gap-3.5">
                <span
                  className="rounded-2xl flex items-center justify-center shrink-0"
                  style={{
                    width: 52,
                    height: 52,
                    background: "linear-gradient(135deg, var(--copper-500), var(--copper-600))",
                    boxShadow: "0 4px 12px rgba(140,74,42,0.3)",
                    color: "#ffffff",
                  }}
                >
                  <Icon name="play" size={26} />
                </span>
                <span className="min-w-0 flex-1">
                  <span
                    className="block text-xs font-extrabold"
                    style={{ color: "var(--copper-600)" }}
                  >
                    جديد على المسابقات؟
                  </span>
                  <span className="block font-black" style={{ color: "var(--text-main)" }}>
                    تعلّم اللعب في دقيقة
                  </span>
                  <span className="block text-xs" style={{ color: "#8c6a52" }}>
                    <NumericRanges>3 أسئلة قصيرة للتجربة، لا تُحسب نقاطها</NumericRanges>
                  </span>
                </span>
              </div>
              <button onClick={onTutorial} className="btn btn-copper mt-3.5 text-sm relative">
                <Icon name="play" size={16} className="icon-inline" /> ابدأ الجولة التجريبية
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
