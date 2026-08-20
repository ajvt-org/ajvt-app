import { curveScore, type ScoreCurve } from "./competitionConfig";

export const TUTORIAL_CURVE: ScoreCurve = {
  fullSeconds: 3,
  maxSeconds: 10,
  floorPercent: 50,
};

export interface TutorialOption {
  id: string;
  text: string;
}

export interface TutorialQuestion {
  id: string;
  text: string;
  category: string;
  points: number;
  correctCount: number;
  options: TutorialOption[];
  correctIds: string[];
}

export const TUTORIAL_QUESTIONS: TutorialQuestion[] = [
  {
    id: "t1",
    text: "ما عاصمة موريتانيا؟",
    category: "تجربة",
    points: 10,
    correctCount: 1,
    options: [
      { id: "t1a", text: "نواكشوط" },
      { id: "t1b", text: "نواذيبو" },
      { id: "t1c", text: "كيفة" },
      { id: "t1d", text: "روصو" },
    ],
    correctIds: ["t1a"],
  },
  {
    id: "t2",
    text: "كم عدد أيام الأسبوع؟",
    category: "تجربة",
    points: 10,
    correctCount: 1,
    options: [
      { id: "t2a", text: "خمسة" },
      { id: "t2b", text: "ستة" },
      { id: "t2c", text: "سبعة" },
      { id: "t2d", text: "ثمانية" },
    ],
    correctIds: ["t2c"],
  },
  {
    id: "t3",
    text: "كم عدد ألوان قوس قزح؟",
    category: "تجربة",
    points: 20,
    correctCount: 1,
    options: [
      { id: "t3a", text: "خمسة" },
      { id: "t3b", text: "ستة" },
      { id: "t3c", text: "سبعة" },
      { id: "t3d", text: "ثمانية" },
    ],
    correctIds: ["t3c"],
  },
];

export function isRight(question: TutorialQuestion, selected: string[]): boolean {
  const picked = new Set(selected);
  return (
    picked.size === question.correctIds.length && question.correctIds.every((id) => picked.has(id))
  );
}

export function gradeTutorial(
  question: TutorialQuestion,
  selected: string[],
  elapsedMs: number,
  curve: ScoreCurve = TUTORIAL_CURVE,
): { isCorrect: boolean; points: number } {
  const late = elapsedMs > curve.maxSeconds * 1000;
  const isCorrect = !late && isRight(question, selected);
  return { isCorrect, points: isCorrect ? curveScore(question.points, curve, elapsedMs) : 0 };
}
