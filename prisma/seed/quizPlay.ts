import { prisma } from "./client";
import { minutesAgo } from "./random";
import { DEFAULT_CURVE } from "../../src/lib/competitionConfig";
import { curveScore } from "../../src/lib/competitionConfig";
import type { SeededUser } from "./members";

type Outcome = "right" | "wrong" | "missed";

const PATTERN: Outcome[][] = [
  ["right", "right", "wrong"],
  ["right", "wrong", "missed"],
  ["missed", "right", "right"],
  ["wrong", "wrong", "right"],
];

async function poolOf(roundId: string) {
  const rows = await prisma.quizRoundQuestion.findMany({
    where: { roundId },
    include: { question: { include: { answers: { orderBy: { order: "asc" } } } } },
  });
  return rows.map((row) => row.question);
}

function elapsedFor(outcome: Outcome, position: number): number {
  if (outcome === "missed") return DEFAULT_CURVE.maxSeconds * 1000;
  return (4 + position * 6) * 1000;
}

async function play(roundId: string, userId: string, outcomes: Outcome[], finishedAt: Date | null) {
  const pool = await poolOf(roundId);
  const answers = pool.slice(0, outcomes.length).map((question, position) => {
    const outcome = outcomes[position];
    const right = question.answers.find((a) => a.isCorrect) ?? question.answers[0];
    const other = question.answers.find((a) => !a.isCorrect) ?? question.answers[0];
    const elapsedMs = elapsedFor(outcome, position);
    return {
      questionId: question.id,
      position,
      optionOrder: question.answers.map((a) => a.id),
      shownAt: finishedAt ?? minutesAgo(30),
      answeredAt: finishedAt ?? minutesAgo(29),
      selectedAnswerIds: outcome === "missed" ? [] : [outcome === "right" ? right.id : other.id],
      isCorrect: outcome === "missed" ? null : outcome === "right",
      elapsedMs,
      points: outcome === "right" ? curveScore(question.points, DEFAULT_CURVE, elapsedMs) : 0,
    };
  });

  const score = answers.reduce((sum, a) => sum + a.points, 0);
  await prisma.quizAttempt.create({
    data: { roundId, userId, score, finishedAt, answers: { create: answers } },
  });
  return score;
}

export async function seedPlayedRounds(users: SeededUser[], competitionId: string) {
  const rounds = await prisma.quizRound.findMany({
    where: { competitionId },
    orderBy: { index: "asc" },
  });
  const now = new Date();
  const closed = rounds.filter((round) => round.closesAt <= now);
  const open = rounds.find((round) => round.opensAt <= now && round.closesAt > now);

  for (const round of closed) {
    for (const [i, user] of users.slice(0, 20).entries()) {
      await play(
        round.id,
        user.id,
        PATTERN[(i + round.index) % PATTERN.length],
        minutesAgo(round.index * 60 + i + 30),
      );
    }
  }

  if (!open) return;
  for (const [i, user] of users.slice(1, 12).entries()) {
    await play(open.id, user.id, PATTERN[i % PATTERN.length], minutesAgo(i + 5));
  }
  await play(open.id, users[0].id, ["right", "missed", "missed"], minutesAgo(3));
}

export async function seedClosingSoon(questions: { id: string }[]) {
  const bank = await prisma.questionBank.findFirstOrThrow({ orderBy: { createdAt: "asc" } });
  const startsAt = new Date(Date.now() - 35 * 60_000);
  const competition = await prisma.competition.create({
    data: {
      name: "مسابقة الليلة",
      startsAt,
      startedAt: startsAt,
      roundCount: 6,
      roundPeriodMinutes: 1440,
      roundWindowMinutes: 60,
      servedCount: 3,
      bankId: bank.id,
      ...DEFAULT_CURVE,
      boards: {
        create: [
          { title: "ترتيب الجولة", blockRounds: 1, counting: 1, wholeRun: false, order: 0 },
          { title: "الترتيب العام", blockRounds: 1, counting: 1, wholeRun: true, order: 1 },
        ],
      },
    },
  });

  for (let index = 0; index < 6; index++) {
    const opensAt = new Date(startsAt.getTime() + index * 1440 * 60_000);
    const pool = questions.slice(index * 3 + 15, index * 3 + 18);
    await prisma.quizRound.create({
      data: {
        competitionId: competition.id,
        index,
        opensAt,
        closesAt: new Date(opensAt.getTime() + 60 * 60_000),
        questions: { create: pool.map((q) => ({ questionId: q.id })) },
      },
    });
  }
  return competition;
}
