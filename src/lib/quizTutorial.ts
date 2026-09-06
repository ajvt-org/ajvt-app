import { curveScore, type ScoreCurve } from "./competitionConfig";

export function isRight(question: { correctIds: string[] }, selected: string[]): boolean {
  const picked = new Set(selected);
  return (
    picked.size === question.correctIds.length && question.correctIds.every((id) => picked.has(id))
  );
}

export function gradeTutorial(
  question: { points: number; correctIds: string[] },
  selected: string[],
  elapsedMs: number,
  curve: ScoreCurve,
): { isCorrect: boolean; points: number } {
  const late = elapsedMs > curve.maxSeconds * 1000;
  const isCorrect = !late && isRight(question, selected);
  return { isCorrect, points: isCorrect ? curveScore(question.points, curve, elapsedMs) : 0 };
}
