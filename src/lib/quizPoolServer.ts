import { prisma } from "./prisma";
import { roundWindows } from "./quizRound";
import { requireCompetition, shapeOf, ALREADY_STARTED } from "./competitionServer";
import { planRounds } from "./quizDraw";
import { ConflictError, ValidationError } from "./errors";

export const NOT_A_ROUND = "هذه الجولة ليست من جولات المسابقة";
export const POOL_TOO_SMALL = "عدد الأسئلة أقل من العدد المطلوب لكل مشارك";

export async function listRounds(competitionId: string) {
  const competition = await requireCompetition(competitionId);
  const windows = roundWindows(shapeOf(competition));
  const [rounds, bankSize] = await Promise.all([
    prisma.quizRound.findMany({
      where: { competitionId: competition.id },
      select: { index: true, category: true, _count: { select: { questions: true } } },
    }),
    prisma.quizQuestion.count({ where: { active: true, bankId: competition.bankId } }),
  ]);
  const known = new Map(rounds.map((r) => [r.index, r]));

  return {
    competition,
    bankSize,
    rounds: windows.map((w) => ({
      index: w.index,
      opensAt: w.opensAt,
      closesAt: w.closesAt,
      category: known.get(w.index)?.category ?? null,
      loaded: known.get(w.index)?._count.questions ?? 0,
    })),
  };
}

export async function setRoundPool(
  competitionId: string,
  index: number,
  questionIds: string[],
  category: string | null = null,
) {
  const competition = await requireCompetition(competitionId);
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

  const round = existing
    ? await prisma.quizRound.update({ where: { id: existing.id }, data: { category } })
    : await prisma.quizRound.create({
        data: {
          competitionId: competition.id,
          index,
          category,
          opensAt: window.opensAt,
          closesAt: window.closesAt,
        },
      });

  await prisma.$transaction([
    prisma.quizRoundQuestion.deleteMany({ where: { roundId: round.id } }),
    prisma.quizRoundQuestion.createMany({
      data: valid.map((questionId) => ({ roundId: round.id, questionId })),
    }),
  ]);

  return { index, loaded: valid.length, skipped: unique.length - valid.length };
}

export async function fillRoundsFromBank(competitionId: string) {
  const competition = await requireCompetition(competitionId);
  if (competition.startedAt) throw new ConflictError(ALREADY_STARTED);

  const bank = await prisma.quizQuestion.findMany({
    where: { active: true, bankId: competition.bankId },
    select: { id: true, category: true, points: true },
    orderBy: { createdAt: "asc" },
  });
  const windows = roundWindows(shapeOf(competition));
  const plans = planRounds(
    bank,
    {
      roundCount: windows.length,
      poolSize: competition.poolSize,
      categoryRounds: competition.categoryRounds,
    },
    competition.id,
  );

  if (plans.length < windows.length) {
    const needed = windows.length * competition.poolSize;
    throw new ValidationError(
      competition.categoryRounds
        ? `التصنيفات لا تكفي، كل جولة تحتاج ${competition.poolSize} سؤالاً من تصنيف واحد، وأمكن تجهيز ${plans.length} جولة من ${windows.length}`
        : `المخزون لا يكفي، المطلوب ${needed} سؤالاً والمتوفر ${bank.length}`,
    );
  }

  for (const plan of plans) {
    await setRoundPool(competitionId, plan.index, plan.questionIds, plan.category);
  }
  return plans.length;
}
