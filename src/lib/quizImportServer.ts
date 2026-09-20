import { prisma } from "./prisma";

export interface ImportedQuestion {
  text: string;
  category: string;
  points: number;
  correctCount: number;
  answers: { text: string; isCorrect: boolean }[];
}

function key(text: string): string {
  return text.replace(/\s+/g, " ").trim().toLowerCase();
}

export async function importQuestions(
  bankId: string,
  questions: ImportedQuestion[],
  createdBy: string,
) {
  const existing = await prisma.quizQuestion.findMany({
    where: { bankId },
    select: { text: true },
  });
  const seen = new Set(existing.map((question) => key(question.text)));

  const fresh = questions.filter((question) => !seen.has(key(question.text)));

  await prisma.$transaction(
    fresh.map((question) =>
      prisma.quizQuestion.create({
        data: {
          text: question.text,
          category: question.category,
          points: question.points,
          correctCount: question.correctCount,
          bankId,
          createdBy,
          answers: {
            create: question.answers.map((answer, order) => ({
              text: answer.text,
              isCorrect: answer.isCorrect,
              order,
            })),
          },
        },
      }),
    ),
  );

  return { imported: fresh.length, skipped: questions.length - fresh.length };
}
