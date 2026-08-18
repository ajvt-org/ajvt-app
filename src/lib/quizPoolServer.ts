import { prisma } from "./prisma";
import { dayStamps } from "./competitionConfig";
import { requireCompetition, ALREADY_STARTED } from "./competitionServer";
import { ConflictError, ValidationError } from "./errors";

export const NOT_A_DAY = "هذا اليوم ليس من أيام المسابقة";
export const POOL_TOO_SMALL = "عدد الأسئلة أقل من العدد المطلوب لكل مشارك";

export async function listDays() {
  const competition = await requireCompetition();
  const stamps = dayStamps(competition.startsOn, competition.days);
  const days = await prisma.quizDay.findMany({
    where: { competitionId: competition.id },
    select: { day: true, _count: { select: { questions: true } } },
  });
  const loaded = new Map(days.map((d) => [d.day, d._count.questions]));

  return {
    competition,
    days: stamps.map((day, index) => ({
      day,
      index,
      loaded: loaded.get(day) ?? 0,
    })),
  };
}

export async function setDayPool(day: string, questionIds: string[]) {
  const competition = await requireCompetition();
  const stamps = dayStamps(competition.startsOn, competition.days);
  if (!stamps.includes(day)) throw new ValidationError(NOT_A_DAY);

  const unique = [...new Set(questionIds)];
  if (unique.length > 0 && unique.length < competition.servedCount) {
    throw new ValidationError(POOL_TOO_SMALL);
  }

  const known = await prisma.quizQuestion.findMany({
    where: { id: { in: unique }, active: true },
    select: { id: true },
  });
  const valid = known.map((q) => q.id);

  const existing = await prisma.quizDay.findUnique({
    where: { competitionId_day: { competitionId: competition.id, day } },
    include: { attempts: { select: { id: true }, take: 1 } },
  });
  if (existing?.attempts.length) throw new ConflictError("بدأ المشاركون هذا اليوم، لا يمكن تغييره");

  const quizDay =
    existing ?? (await prisma.quizDay.create({ data: { competitionId: competition.id, day } }));

  await prisma.$transaction([
    prisma.quizDayQuestion.deleteMany({ where: { dayId: quizDay.id } }),
    prisma.quizDayQuestion.createMany({
      data: valid.map((questionId) => ({ dayId: quizDay.id, questionId })),
    }),
  ]);

  return { day, loaded: valid.length, skipped: unique.length - valid.length };
}

export async function fillDaysFromBank() {
  const competition = await requireCompetition();
  if (competition.startedAt) throw new ConflictError(ALREADY_STARTED);

  const questions = await prisma.quizQuestion.findMany({
    where: { active: true },
    select: { id: true },
    orderBy: { createdAt: "asc" },
  });
  const stamps = dayStamps(competition.startsOn, competition.days);
  const needed = stamps.length * competition.poolSize;
  if (questions.length < needed) {
    throw new ValidationError(
      `المخزون لا يكفي، المطلوب ${needed} سؤالاً والمتوفر ${questions.length}`,
    );
  }

  const filled: string[] = [];
  for (let i = 0; i < stamps.length; i++) {
    const slice = questions.slice(i * competition.poolSize, (i + 1) * competition.poolSize);
    await setDayPool(
      stamps[i],
      slice.map((q) => q.id),
    );
    filled.push(stamps[i]);
  }
  return filled.length;
}
