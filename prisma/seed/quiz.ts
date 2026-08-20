import { randomUUID } from "crypto";
import { prisma } from "./client";
import { questionBank } from "./questionBank";
import { daysAgo, daysFromNow, minutesAgo } from "./random";
import { DEFAULT_CURVE } from "../../src/lib/competitionConfig";
import type { SeededUser } from "./members";

export async function seedQuizSettings() {
  await prisma.quizSettings.upsert({
    where: { id: "singleton" },
    update: { defaultPoints: 10 },
    create: { id: "singleton", defaultPoints: 10 },
  });
}

export async function seedQuestions() {
  const bank = await prisma.questionBank.upsert({
    where: { id: "general" },
    update: {},
    create: { id: "general", name: "البنك العام" },
  });
  const rows = questionBank().map(([text, category, answers, correctIndex, points]) => ({
    id: randomUUID(),
    text,
    category,
    points,
    correctCount: 1,
    active: true,
    bankId: bank.id,
    createdBy: "admin",
    answers: answers.map((answer, order) => ({
      text: answer,
      isCorrect: order === correctIndex,
      order,
    })),
  }));

  await prisma.quizQuestion.createMany({
    data: rows.map(({ answers, ...q }) => {
      void answers;
      return q;
    }),
  });
  await prisma.quizAnswer.createMany({
    data: rows.flatMap((q) => q.answers.map((a) => ({ ...a, questionId: q.id }))),
  });

  return rows.map((q) => ({ id: q.id }));
}

const TESTER_PHONE = "21000000";

export async function seedCompetitions(users: SeededUser[], questions: { id: string }[]) {
  const bank = await prisma.questionBank.findFirstOrThrow({ orderBy: { createdAt: "asc" } });
  const start = daysAgo(2);
  const shape = {
    startsAt: start,
    roundCount: 5,
    roundPeriodMinutes: 1440,
    roundWindowMinutes: 1440,
    servedCount: 3,
    bankId: bank.id,
    boards: {
      create: [
        { title: "ترتيب الجولة", blockRounds: 1, counting: 1, wholeRun: false, order: 0 },
        {
          title: "ترتيب الأسبوع",
          blockTitle: "الأسبوع",
          blockRounds: 7,
          counting: 6,
          wholeRun: false,
          order: 1,
        },
        { title: "الترتيب العام", blockRounds: 1, counting: 1, wholeRun: true, order: 2 },
      ],
    },
    ...DEFAULT_CURVE,
  };

  const open = await prisma.competition.create({
    data: { ...shape, name: "مسابقة الصيف", startedAt: daysAgo(2) },
  });
  const second = await prisma.competition.create({
    data: { ...shape, name: "مسابقة الأسبوع", startedAt: daysAgo(2) },
  });
  await prisma.competition.create({
    data: { ...shape, name: "مسابقة الخريف", startsAt: daysFromNow(7) },
  });
  const invited = await prisma.competition.create({
    data: {
      ...shape,
      name: "مسابقة البدريين",
      visibility: "PRIVATE",
      categoryRounds: true,
      startedAt: daysAgo(2),
    },
  });

  const tester = await prisma.user.findUnique({ where: { phone: TESTER_PHONE } });
  const listed = new Set(users.slice(0, 12).map((u) => u.id));
  if (tester) listed.add(tester.id);
  await prisma.quizParticipant.createMany({
    data: [...listed].map((userId) => ({ competitionId: invited.id, userId })),
  });

  for (const competition of [open, second, invited]) {
    for (let index = 0; index < shape.roundCount; index++) {
      const opensAt = new Date(start.getTime() + index * shape.roundPeriodMinutes * 60_000);
      const pool = questions.slice(index * shape.servedCount, (index + 1) * shape.servedCount);
      await prisma.quizRound.create({
        data: {
          competitionId: competition.id,
          index,
          opensAt,
          closesAt: new Date(opensAt.getTime() + shape.roundWindowMinutes * 60_000),
          questions: { create: pool.map((q) => ({ questionId: q.id })) },
        },
      });
    }
  }

  const rounds = await prisma.quizRound.findMany({
    where: { competitionId: open.id, index: { lt: 2 } },
    orderBy: { index: "asc" },
  });
  for (const round of rounds) {
    for (let i = 0; i < 20; i++) {
      await prisma.quizAttempt.create({
        data: {
          roundId: round.id,
          userId: users[i].id,
          score: (i * 7 + round.index * 3) % 31,
          finishedAt: minutesAgo(round.index * 60 + i),
        },
      });
    }
  }
}
