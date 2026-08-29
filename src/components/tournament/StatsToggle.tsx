"use client";

import { useState } from "react";
import IconLabel from "@/components/IconLabel";
import TournamentSummary from "./TournamentSummary";

interface StatsToggleProps {
  matchesPlayed: number;
  totalGoals: number;
  avgGoalsPerMatch: number;
  bestAttack: { name: string; gf: number } | null;
}

export default function StatsToggle({
  matchesPlayed,
  totalGoals,
  avgGoalsPerMatch,
  bestAttack,
}: StatsToggleProps) {
  const [show, setShow] = useState(false);

  return (
    <div>
      <button
        onClick={() => setShow((v) => !v)}
        className="text-xs px-3 py-1.5 rounded-lg font-bold"
        style={{ background: "var(--mint-100)", color: "var(--mint-700)" }}
      >
        <IconLabel name={show ? "chevronUp" : "chart"}>
          {show ? "إخفاء الإحصائيات" : "عرض الإحصائيات"}
        </IconLabel>
      </button>

      {show && (
        <div className="mt-2">
          <TournamentSummary
            matchesPlayed={matchesPlayed}
            totalGoals={totalGoals}
            avgGoalsPerMatch={avgGoalsPerMatch}
            bestAttack={bestAttack}
          />
        </div>
      )}
    </div>
  );
}
