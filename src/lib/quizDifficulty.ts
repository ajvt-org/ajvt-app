export const DIFFICULTIES = ["EASY", "MEDIUM", "HARD"] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

export const POINTS_MIN = 10;
export const POINTS_MAX = 100;

export const BANDS: { difficulty: Difficulty; from: number; to: number }[] = [
  { difficulty: "EASY", from: 10, to: 49 },
  { difficulty: "MEDIUM", from: 50, to: 79 },
  { difficulty: "HARD", from: 80, to: 100 },
];

export const DEFAULT_POINTS = POINTS_MIN;

export function difficultyOf(points: number): Difficulty {
  if (!Number.isInteger(points)) return "EASY";
  const band = BANDS.find((b) => points >= b.from && points <= b.to);
  return band?.difficulty ?? (points > POINTS_MAX ? "HARD" : "EASY");
}

export function pointsInRange(points: unknown): boolean {
  return (
    Number.isInteger(points) && (points as number) >= POINTS_MIN && (points as number) <= POINTS_MAX
  );
}

export function normalisePoints(points: unknown): number {
  return pointsInRange(points) ? (points as number) : DEFAULT_POINTS;
}

export function bandOf(difficulty: Difficulty) {
  return BANDS.find((b) => b.difficulty === difficulty)!;
}

export function countByDifficulty(points: number[]): Record<Difficulty, number> {
  const out: Record<Difficulty, number> = { EASY: 0, MEDIUM: 0, HARD: 0 };
  for (const p of points) out[difficultyOf(p)] += 1;
  return out;
}
