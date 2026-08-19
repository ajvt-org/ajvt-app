import { curveScore, DEFAULT_CURVE, type ScoreCurve } from "./competitionConfig";

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
    text: "أي من هذه المدن على الساحل؟",
    category: "تجربة",
    points: 20,
    correctCount: 2,
    options: [
      { id: "t3a", text: "نواذيبو" },
      { id: "t3b", text: "أطار" },
      { id: "t3c", text: "نواكشوط" },
      { id: "t3d", text: "النعمة" },
    ],
    correctIds: ["t3a", "t3c"],
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
  curve: ScoreCurve = DEFAULT_CURVE,
): { isCorrect: boolean; points: number } {
  const isCorrect = isRight(question, selected);
  return { isCorrect, points: isCorrect ? curveScore(question.points, curve, elapsedMs) : 0 };
}
