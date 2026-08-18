"use client";

import { difficultyOf, BANDS, POINTS_MIN, POINTS_MAX } from "@/lib/quizDifficulty";

const LABEL: Record<string, string> = {
  EASY: "سهل",
  MEDIUM: "متوسط",
  HARD: "صعب",
};

export default function DifficultyHint({ points }: { points: string }) {
  const value = Number(points);
  const known = Number.isInteger(value) && value >= POINTS_MIN && value <= POINTS_MAX;
  const difficulty = known ? difficultyOf(value) : null;

  return (
    <p className="text-xs mt-1" style={{ color: known ? "var(--mint-700)" : "var(--text-muted)" }}>
      {difficulty
        ? LABEL[difficulty]
        : BANDS.map((b) => `${LABEL[b.difficulty]} ${b.from} إلى ${b.to}`).join("، ")}
    </p>
  );
}
