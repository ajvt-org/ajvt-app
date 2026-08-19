"use client";

import PageHeader from "@/components/PageHeader";
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
      <PageHeader title="المسابقات الثقافية" backHref={backHref} />
      <div className="px-5 py-6 pb-10 space-y-3">
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
          const playable = competition.state === "open" || competition.state === "closed";
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
                    {`${STATE_LABEL[competition.state]} · ${competition.playedRounds} من ${countedNoun(competition.roundCount, ROUNDS)}`}
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
          <button onClick={onTutorial} className="btn btn-sm text-xs">
            جولة تجريبية
          </button>
        )}
      </div>
    </div>
  );
}
