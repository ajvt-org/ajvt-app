import { prisma } from "./prisma";
import { TUTORIAL_BANK_ID } from "./questionBankServer";

export interface TutorialView {
  id: string;
  text: string;
  category: string;
  points: number;
  correctCount: number;
  options: { id: string; text: string }[];
  correctIds: string[];
}

function playable(question: TutorialView): boolean {
  return (
    question.options.length >= 2 &&
    question.correctIds.length === question.correctCount &&
    question.correctIds.length > 0
  );
}

export async function tutorialQuestions(): Promise<TutorialView[]> {
  const rows = await prisma.quizQuestion.findMany({
    where: { bankId: TUTORIAL_BANK_ID, active: true },
    orderBy: [{ order: "asc" }, { createdAt: "desc" }],
    select: {
      id: true,
      text: true,
      category: true,
      points: true,
      correctCount: true,
      answers: { select: { id: true, text: true, isCorrect: true }, orderBy: { order: "asc" } },
    },
  });

  return rows
    .map((row) => ({
      id: row.id,
      text: row.text,
      category: row.category,
      points: row.points,
      correctCount: row.correctCount,
      options: row.answers.map((answer) => ({ id: answer.id, text: answer.text })),
      correctIds: row.answers.filter((answer) => answer.isCorrect).map((answer) => answer.id),
    }))
    .filter(playable);
}
