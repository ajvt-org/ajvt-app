export const DIFFICULTIES = ["EASY", "MEDIUM", "HARD"] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

export const POINTS_MIN = 1;
export const POINTS_MAX = 20;

export const BANDS: { difficulty: Difficulty; from: number; to: number }[] = [
  { difficulty: "EASY", from: 1, to: 10 },
  { difficulty: "MEDIUM", from: 11, to: 16 },
  { difficulty: "HARD", from: 17, to: 20 },
];

export const DEFAULT_POINTS = 10;

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
