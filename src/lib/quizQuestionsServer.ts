import { prisma } from "./prisma";
import { ValidationError } from "./errors";
import { ANSWER, quiz } from "./messages";
import { counted } from "./arabicCount";
import { getQuizSettings } from "./quiz";
import { normalisePoints, pointsInRange } from "./quizDifficulty";

export interface AnswerInput {
  text: string;
  isCorrect?: boolean;
}

export interface NewQuestion {
  text?: string;
  category?: string;
  points?: unknown;
  correctCount?: unknown;
  answers?: unknown;
}

export function checkedAnswers(answers: unknown, correctCount: number): AnswerInput[] {
  if (!Array.isArray(answers) || answers.length < 2) {
    throw new ValidationError(quiz.twoAnswersMinimum);
  }
  const rows = answers as AnswerInput[];
  if (rows.some((answer) => !answer?.text?.trim())) {
    throw new ValidationError(quiz.answersNeedText);
  }
  if (correctCount > rows.length) throw new ValidationError(quiz.tooManyCorrect);
  if (rows.filter((answer) => answer.isCorrect).length !== correctCount) {
    throw new ValidationError(quiz.correctCountExact(counted(correctCount, ANSWER)));
  }
  return rows;
}

export function answerRows(answers: AnswerInput[]) {
  return answers.map((answer, order) => ({
    text: answer.text.trim(),
    isCorrect: !!answer.isCorrect,
    order,
  }));
}

export async function questionRows(bankId: string) {
  const [questions, sent, answered, correct] = await Promise.all([
    prisma.quizQuestion.findMany({
      where: { bankId },
      orderBy: [{ order: "asc" }, { createdAt: "desc" }],
      select: {
        id: true,
        text: true,
        category: true,
        points: true,
        correctCount: true,
        order: true,
        active: true,
        createdAt: true,
        answers: {
          select: { id: true, text: true, isCorrect: true, order: true },
          orderBy: { order: "asc" },
        },
      },
    }),
    prisma.quizAttemptAnswer.groupBy({ by: ["questionId"], _count: true }),
    prisma.quizAttemptAnswer.groupBy({
      by: ["questionId"],
      where: { answeredAt: { not: null } },
      _count: true,
    }),
    prisma.quizAttemptAnswer.groupBy({
      by: ["questionId"],
      where: { isCorrect: true },
      _count: true,
    }),
  ]);

  const sentMap = new Map(sent.map((row) => [row.questionId, row._count]));
  const answeredMap = new Map(answered.map((row) => [row.questionId, row._count]));
  const correctMap = new Map(correct.map((row) => [row.questionId, row._count]));

  return questions.map((question) => ({
    ...question,
    sentCount: sentMap.get(question.id) ?? 0,
    answeredCount: answeredMap.get(question.id) ?? 0,
    correctSubmissions: correctMap.get(question.id) ?? 0,
  }));
}

export async function createQuestion(bankId: string, input: NewQuestion, createdBy: string) {
  if (!input.text?.trim()) throw new ValidationError(quiz.textRequired);
  if (!input.category?.trim()) throw new ValidationError(quiz.categoryRequired);

  const answers = input.answers;
  if (!Array.isArray(answers) || answers.length < 2) {
    throw new ValidationError(quiz.twoAnswersMinimum);
  }
  if ((answers as AnswerInput[]).some((answer) => !answer?.text?.trim())) {
    throw new ValidationError(quiz.answersNeedText);
  }

  const points = input.points;
  if (points !== undefined && points !== null && !pointsInRange(points)) {
    throw new ValidationError(quiz.pointsOutOfRange);
  }

  const settings = await getQuizSettings();
  const wantedPoints =
    points === undefined || points === null ? settings.defaultPoints : normalisePoints(points);
  const correctCount =
    Number.isInteger(input.correctCount) && (input.correctCount as number) > 0
      ? (input.correctCount as number)
      : settings.defaultCorrectCount;

  const rows = checkedAnswers(answers, correctCount);

  return prisma.quizQuestion.create({
    data: {
      text: input.text.trim(),
      category: input.category.trim(),
      points: wantedPoints,
      correctCount,
      bankId,
      createdBy,
      answers: { create: answerRows(rows) },
    },
    include: { answers: { orderBy: { order: "asc" } } },
  });
}
