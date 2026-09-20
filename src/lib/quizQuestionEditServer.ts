import { prisma } from "./prisma";
import { ConflictError, NotFoundError, ValidationError } from "./errors";
import { quiz } from "./messages";
import { isForeignKeyViolation } from "./prismaError";
import { moveInOrder, type MoveDirection } from "./quizQuestionOrder";
import { answerRows, checkedAnswers, type AnswerInput } from "./quizQuestionsServer";

interface QuestionData {
  text?: string;
  category?: string;
  points?: number;
  active?: boolean;
  correctCount?: number;
  answers?: { create: { text: string; isCorrect: boolean; order: number }[] };
}

export interface QuestionEdit {
  text?: string;
  category?: string;
  points?: unknown;
  correctCount?: unknown;
  active?: unknown;
  answers?: unknown;
}

async function refuseWhenPlayed(id: string, message: string): Promise<void> {
  const [drawn, answered] = await Promise.all([
    prisma.quizRoundQuestion.count({ where: { questionId: id } }),
    prisma.quizAttemptAnswer.count({ where: { questionId: id } }),
  ]);
  if (drawn > 0 || answered > 0) throw new ConflictError(message);
}

export async function updateQuestion(id: string, edit: QuestionEdit) {
  const existing = await prisma.quizQuestion.findUnique({ where: { id } });
  if (!existing) throw new NotFoundError(quiz.questionNotFound);

  const rewritesPlay =
    edit.answers !== undefined || edit.correctCount !== undefined || edit.points !== undefined;
  if (rewritesPlay) await refuseWhenPlayed(id, quiz.questionAnswersLocked);

  const data: QuestionData = {};

  if (edit.text !== undefined) {
    if (!edit.text.trim()) throw new ValidationError(quiz.textRequired);
    data.text = edit.text.trim();
  }
  if (edit.category !== undefined) {
    if (!edit.category.trim()) throw new ValidationError(quiz.categoryRequired);
    data.category = edit.category.trim();
  }
  if (edit.points !== undefined) {
    if (!Number.isInteger(edit.points) || (edit.points as number) <= 0) {
      throw new ValidationError(quiz.pointsNotPositive);
    }
    data.points = edit.points as number;
  }
  if (edit.active !== undefined) data.active = !!edit.active;

  let correctCount = existing.correctCount;
  if (edit.correctCount !== undefined) {
    if (!Number.isInteger(edit.correctCount) || (edit.correctCount as number) <= 0) {
      throw new ValidationError(quiz.correctCountInvalid);
    }
    correctCount = edit.correctCount as number;
    data.correctCount = correctCount;
  }

  let rows: AnswerInput[] | null = null;
  if (edit.answers !== undefined) rows = checkedAnswers(edit.answers, correctCount);

  return prisma.$transaction(async (tx) => {
    if (rows) {
      await tx.quizAnswer.deleteMany({ where: { questionId: id } });
      data.answers = { create: answerRows(rows) };
    }
    return tx.quizQuestion.update({
      where: { id },
      data,
      include: { answers: { orderBy: { order: "asc" } } },
    });
  });
}

export async function removeQuestion(id: string) {
  const question = await prisma.quizQuestion.findUnique({
    where: { id },
    select: { text: true },
  });
  if (!question) throw new NotFoundError(quiz.questionNotFound);

  await refuseWhenPlayed(id, quiz.questionInUse);

  try {
    await prisma.quizQuestion.delete({ where: { id } });
  } catch (err) {
    if (isForeignKeyViolation(err)) throw new ConflictError(quiz.questionInUse);
    throw err;
  }

  return question;
}

export async function moveQuestion(id: string, direction: MoveDirection) {
  const question = await prisma.quizQuestion.findUnique({
    where: { id },
    select: { bankId: true, text: true },
  });
  if (!question) throw new NotFoundError(quiz.questionNotFound);

  const siblings = await prisma.quizQuestion.findMany({
    where: { bankId: question.bankId },
    orderBy: [{ order: "asc" }, { createdAt: "desc" }],
    select: { id: true },
  });

  const wanted = moveInOrder(
    siblings.map((sibling) => sibling.id),
    id,
    direction,
  );

  await prisma.$transaction(
    wanted.map((questionId, position) =>
      prisma.quizQuestion.update({ where: { id: questionId }, data: { order: position } }),
    ),
  );

  return { question, ids: wanted };
}
