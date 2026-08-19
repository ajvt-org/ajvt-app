import { prisma } from "./prisma";
import { roundWindows } from "./quizRound";
import { requireCompetition, shapeOf, ALREADY_STARTED } from "./competitionServer";
import { planRounds, type RoundPlan } from "./quizDraw";
import { ConflictError, ValidationError } from "./errors";

export const NOT_A_ROUND = "هذه الجولة ليست من جولات المسابقة";
export const WRONG_POOL_SIZE = "عدد الأسئلة يجب أن يساوي عدد أسئلة الجولة";

async function bankPlans(competition: {
  id: string;
  bankId: string;
  roundCount: number;
  servedCount: number;
  categoryRounds: boolean;
}): Promise<{ bankSize: number; plans: RoundPlan[] }> {
  const bank = await prisma.quizQuestion.findMany({
    where: { active: true, bankId: competition.bankId },
    select: { id: true, category: true, points: true },
    orderBy: { createdAt: "asc" },
  });
  const plans = planRounds(
    bank,
    {
      roundCount: competition.roundCount,
      questionCount: competition.servedCount,
      categoryRounds: competition.categoryRounds,
    },
    competition.id,
  );
  return { bankSize: bank.length, plans };
}

export async function listRounds(competitionId: string) {
  const competition = await requireCompetition(competitionId);
  const windows = roundWindows(shapeOf(competition));
  const [rounds, { bankSize, plans }] = await Promise.all([
    prisma.quizRound.findMany({
      where: { competitionId: competition.id },
      select: { index: true, category: true, _count: { select: { questions: true } } },
    }),
    bankPlans(competition),
  ]);
  const known = new Map(rounds.map((r) => [r.index, r]));
  const planned = new Map(plans.map((p) => [p.index, p]));

  return {
    competition,
    bankSize,
    plannable: plans.length,
    rounds: windows.map((w) => ({
      index: w.index,
      opensAt: w.opensAt,
      closesAt: w.closesAt,
      category: known.get(w.index)?.category ?? planned.get(w.index)?.category ?? null,
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
  const known = await prisma.quizQuestion.findMany({
    where: { id: { in: unique }, active: true },
    select: { id: true },
  });
  const valid = known.map((q) => q.id);
  if (unique.length > 0 && valid.length !== competition.servedCount) {
    throw new ValidationError(WRONG_POOL_SIZE);
  }

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

  const windows = roundWindows(shapeOf(competition));
  const { bankSize, plans } = await bankPlans(competition);

  if (plans.length < windows.length) {
    const needed = windows.length * competition.servedCount;
    throw new ValidationError(
      competition.categoryRounds
        ? `التصنيفات لا تكفي، كل جولة تحتاج ${competition.servedCount} سؤالاً من تصنيف واحد، وأمكن تجهيز ${plans.length} جولة من ${windows.length}`
        : `المخزون لا يكفي، المطلوب ${needed} سؤالاً والمتوفر ${bankSize}`,
    );
  }

  for (const plan of plans) {
    await setRoundPool(competitionId, plan.index, plan.questionIds, plan.category);
  }
  return plans.length;
}
