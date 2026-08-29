import { prisma } from "./prisma";
import { correctRate, NO_TALLY, talliesOf } from "./quizRecap";

export interface RecapQuestion {
  id: string;
  text: string;
  category: string;
  correct: string[];
  answered: number;
  right: number;
  rate: number | null;
}

export interface RoundRecap {
  round: number;
  category: string | null;
  closesAt: Date;
  players: number;
  questions: RecapQuestion[];
}

export async function lastClosedRecap(
  competitionId: string,
  now = new Date(),
): Promise<RoundRecap | null> {
  const round = await prisma.quizRound.findFirst({
    where: {
      competitionId,
      closesAt: { lte: now },
      competition: { startedAt: { not: null } },
    },
    orderBy: { index: "desc" },
    select: {
      id: true,
      index: true,
      category: true,
      closesAt: true,
      questions: {
        select: {
          question: {
            select: {
              id: true,
              text: true,
              category: true,
              answers: {
                where: { isCorrect: true },
                orderBy: { order: "asc" },
                select: { text: true },
              },
            },
          },
        },
      },
    },
  });
  if (!round) return null;

  const played = { roundId: round.id, voidedAt: null };
  const [grouped, players] = await Promise.all([
    prisma.quizAttemptAnswer.groupBy({
      by: ["questionId", "isCorrect"],
      where: { attempt: played },
      _count: { _all: true },
    }),
    prisma.quizAttempt.count({ where: played }),
  ]);

  const tallies = talliesOf(
    grouped.map((row) => ({
      questionId: row.questionId,
      isCorrect: row.isCorrect,
      count: row._count._all,
    })),
  );

  return {
    round: round.index,
    category: round.category,
    closesAt: round.closesAt,
    players,
    questions: round.questions.map(({ question }) => {
      const tally = tallies.get(question.id) ?? NO_TALLY;
      return {
        id: question.id,
        text: question.text,
        category: question.category,
        correct: question.answers.map((answer) => answer.text),
        answered: tally.answered,
        right: tally.correct,
        rate: correctRate(tally),
      };
    }),
  };
}
