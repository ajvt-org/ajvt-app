"use client";

import Icon from "@/components/Icon";

function Tile({
  icon,
  color,
  value,
  label,
}: {
  icon: "flame" | "star";
  color: string;
  value: number;
  label: string;
}) {
  return (
    <div className="card p-3 text-center">
      <div className="flex justify-center" style={{ color }}>
        <Icon name={icon} size={22} />
      </div>
      <p className="text-lg font-black" style={{ color }}>
        {value}
      </p>
      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
        {label}
      </p>
    </div>
  );
}

export default function QuizStats({
  streak,
  totalPoints,
  rank,
  totalParticipants,
}: {
  streak: number;
  totalPoints: number;
  rank: number;
  totalParticipants: number;
}) {
  const top3 = rank >= 1 && rank <= 3;
  const percentile =
    totalParticipants > 1
      ? Math.max(0, Math.round(((totalParticipants - rank) / (totalParticipants - 1)) * 100))
      : 100;

  return (
    <div className="grid grid-cols-3 gap-2 fade-up">
      <Tile icon="flame" color="var(--copper-600)" value={streak} label="يوم متتالي" />
      <Tile icon="star" color="var(--mint-700)" value={totalPoints} label="نقطة" />
      <div
        className="card p-3 text-center"
        style={{
          background: top3
            ? "linear-gradient(160deg, var(--copper-400), var(--copper-600))"
            : "linear-gradient(160deg, var(--mint-600), var(--mint-700))",
          boxShadow: top3 ? "0 4px 14px rgba(140,74,42,0.3)" : "0 4px 14px rgba(37,92,73,0.25)",
        }}
      >
        <div className="flex justify-center text-white">
          <Icon name="medal" size={22} />
        </div>
        <p className="text-lg font-black text-white">#{rank}</p>
        <p className="text-xs" style={{ color: "rgba(255,255,255,0.85)" }}>
          {totalParticipants > 1 ? `أفضل من ${percentile}%` : "الأول"}
        </p>
      </div>
    </div>
  );
}
