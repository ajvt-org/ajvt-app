"use client";

import PageHeader from "@/components/PageHeader";
import Icon from "@/components/Icon";
import type { RunningCompetition } from "./types";

export default function QuizPicker({
  competitions,
  backHref,
  onPick,
}: {
  competitions: RunningCompetition[];
  backHref: string;
  onPick: (id: string) => void;
}) {
  return (
    <div className="app-shell">
      <PageHeader title="المسابقات" backHref={backHref} />
      <div className="px-5 py-6 pb-10 space-y-3">
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          اختر المسابقة التي تريد المشاركة فيها
        </p>
        {competitions.map((competition) => (
          <button
            key={competition.id}
            onClick={() => onPick(competition.id)}
            className="card p-4 w-full text-start flex items-center gap-3"
          >
            <Icon name={competition.visibility === "PRIVATE" ? "lock" : "trophy"} size={20} />
            <span>
              <span className="block font-bold" style={{ color: "var(--text-main)" }}>
                {competition.name}
              </span>
              <span className="block text-xs" style={{ color: "var(--text-muted)" }}>
                {competition.roundCount} جولة
              </span>
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
