"use client";

import Image from "next/image";
import BackButton from "@/components/BackButton";
import Icon from "@/components/Icon";
import NumericRanges from "@/components/NumericRanges";
import type { CompetitionState, RunningCompetition } from "./types";
import { countedNoun, ROUNDS } from "@/lib/arabicPlural";

const STATE_LABEL: Record<CompetitionState, string> = {
  before: "لم تنطلق بعد",
  open: "جولة مفتوحة الآن",
  closed: "بين جولتين",
  over: "انتهت",
};

export default function QuizPicker({
  competitions,
  backHref,
  onPick,
  onTutorial,
}: {
  competitions: RunningCompetition[];
  backHref: string;
  onPick: (id: string) => void;
  onTutorial?: () => void;
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
        {competitions.length === 0 ? (
          <div className="card p-6 text-center space-y-2">
            <div className="flex justify-center" style={{ color: "var(--mint-500)" }}>
              <Icon name="trophy" size={36} />
            </div>
            <p className="font-semibold" style={{ color: "var(--text-main)" }}>
              لا توجد مسابقة تشارك فيها الآن
            </p>
          </div>
        ) : (
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            المسابقات التي تشارك فيها
          </p>
        )}

        {competitions.map((competition) => {
          const playable = competition.state !== "before";
          return (
            <button
              key={competition.id}
              onClick={() => onPick(competition.id)}
              disabled={!playable}
              className="card p-4 w-full text-start flex items-center gap-3 disabled:opacity-60"
            >
              <Icon name={competition.visibility === "PRIVATE" ? "lock" : "trophy"} size={20} />
              <span className="flex-1 min-w-0">
                <span className="block font-bold truncate" style={{ color: "var(--text-main)" }}>
                  {competition.name}
                </span>
                <span className="block text-xs" style={{ color: "var(--text-muted)" }}>
                  <NumericRanges>
                    {`${STATE_LABEL[competition.state]} · ${competition.passedRounds} من ${countedNoun(competition.roundCount, ROUNDS)}`}
                  </NumericRanges>
                </span>
              </span>
              <span className="text-sm font-black" style={{ color: "var(--mint-700)" }}>
                <NumericRanges>{`${competition.myScore}`}</NumericRanges>
              </span>
            </button>
          );
        })}

        {onTutorial && (
          <div className="card p-4 relative overflow-hidden">
            <div
              className="absolute rounded-full"
              style={{
                insetInlineStart: -22,
                top: -22,
                width: 90,
                height: 90,
                background: "#f7e9de",
                opacity: 0.6,
              }}
            />
            <div className="relative flex items-center gap-3.5">
              <span
                className="rounded-2xl flex items-center justify-center shrink-0"
                style={{
                  width: 56,
                  height: 56,
                  background: "linear-gradient(135deg, #f7e9de, #f1dcc9)",
                  color: "var(--copper-600)",
                }}
              >
                <Icon name="play" size={28} />
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
                <span className="block text-xs" style={{ color: "var(--text-muted)" }}>
                  <NumericRanges>3 أسئلة قصيرة للتجربة، لا تُحسب نقاطها</NumericRanges>
                </span>
              </span>
            </div>
            <button onClick={onTutorial} className="btn btn-copper mt-3.5 text-sm relative">
              <Icon name="play" size={16} className="icon-inline" /> ابدأ الجولة التجريبية
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
