import { prisma } from "./prisma";
import { roundWindows } from "./quizRound";
import { requireCompetition, shapeOf, ALREADY_STARTED } from "./competitionServer";
import { ConflictError, ValidationError } from "./errors";

export const NOT_A_ROUND = "هذه الجولة ليست من جولات المسابقة";
export const POOL_TOO_SMALL = "عدد الأسئلة أقل من العدد المطلوب لكل مشارك";

export async function listRounds() {
  const competition = await requireCompetition();
  const windows = roundWindows(shapeOf(competition));
  const rounds = await prisma.quizRound.findMany({
    where: { competitionId: competition.id },
    select: { index: true, _count: { select: { questions: true } } },
  });
  const loaded = new Map(rounds.map((r) => [r.index, r._count.questions]));

  return {
    competition,
    rounds: windows.map((w) => ({
      index: w.index,
      opensAt: w.opensAt,
      closesAt: w.closesAt,
      loaded: loaded.get(w.index) ?? 0,
    })),
  };
}

export async function setRoundPool(index: number, questionIds: string[]) {
  const competition = await requireCompetition();
  const window = roundWindows(shapeOf(competition)).find((w) => w.index === index);
  if (!window) throw new ValidationError(NOT_A_ROUND);

  const unique = [...new Set(questionIds)];
  if (unique.length > 0 && unique.length < competition.servedCount) {
    throw new ValidationError(POOL_TOO_SMALL);
  }

  const known = await prisma.quizQuestion.findMany({
    where: { id: { in: unique }, active: true },
    select: { id: true },
  });
  const valid = known.map((q) => q.id);

  const existing = await prisma.quizRound.findUnique({
    where: { competitionId_index: { competitionId: competition.id, index } },
    include: { attempts: { select: { id: true }, take: 1 } },
  });
  if (existing?.attempts.length) {
    throw new ConflictError("بدأ المشاركون هذه الجولة، لا يمكن تغييرها");
  }

  const round =
    existing ??
    (await prisma.quizRound.create({
      data: {
        competitionId: competition.id,
        index,
        opensAt: window.opensAt,
        closesAt: window.closesAt,
      },
    }));

  await prisma.$transaction([
    prisma.quizRoundQuestion.deleteMany({ where: { roundId: round.id } }),
    prisma.quizRoundQuestion.createMany({
      data: valid.map((questionId) => ({ roundId: round.id, questionId })),
    }),
  ]);

  return { index, loaded: valid.length, skipped: unique.length - valid.length };
}

export async function fillRoundsFromBank() {
  const competition = await requireCompetition();
  if (competition.startedAt) throw new ConflictError(ALREADY_STARTED);

  const questions = await prisma.quizQuestion.findMany({
    where: { active: true },
    select: { id: true },
    orderBy: { createdAt: "asc" },
  });
  const windows = roundWindows(shapeOf(competition));
  const needed = windows.length * competition.poolSize;
  if (questions.length < needed) {
    throw new ValidationError(
      `المخزون لا يكفي، المطلوب ${needed} سؤالاً والمتوفر ${questions.length}`,
    );
  }

  let filled = 0;
  for (const window of windows) {
    const slice = questions.slice(
      window.index * competition.poolSize,
      (window.index + 1) * competition.poolSize,
    );
    await setRoundPool(
      window.index,
      slice.map((q) => q.id),
    );
    filled += 1;
  }
  return filled;
}
