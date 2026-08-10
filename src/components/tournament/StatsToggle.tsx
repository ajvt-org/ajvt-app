"use client";

import { useState } from "react";

interface StatsToggleProps {
  matchesPlayed: number;
  totalGoals: number;
  avgGoalsPerMatch: number;
  bestAttack: string;
}

export default function StatsToggle({ matchesPlayed, totalGoals, avgGoalsPerMatch, bestAttack }: StatsToggleProps) {
  const [show, setShow] = useState(false);

  return (
    <div>
      <button
        onClick={() => setShow((v) => !v)}
        className="text-xs px-3 py-1.5 rounded-lg font-bold"
        style={{ background: "var(--mint-100)", color: "var(--mint-700)" }}
      >
        {show ? "🔼 إخفاء الإحصائيات" : "📊 عرض الإحصائيات"}
      </button>

      {show && (
        <div className="grid grid-cols-2 gap-2 mt-2">
          <StatBox label="مباريات لُعبت" value={matchesPlayed} />
          <StatBox label="مجموع الأهداف" value={totalGoals} />
          <StatBox label="معدل الأهداف/مباراة" value={avgGoalsPerMatch} />
          <StatBox label="أفضل هجوم" value={bestAttack} />
        </div>
      )}
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="card p-3 text-center">
      <p className="text-lg font-black" style={{ color: "var(--mint-700)" }}>{value}</p>
      <p className="text-xs" style={{ color: "var(--text-muted)" }}>{label}</p>
    </div>
  );
}
