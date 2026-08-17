import { randomUUID } from "crypto";
import { prisma } from "./prisma";
import { sendPushToUser } from "./push";
import { MEMBERSHIP_FEE } from "./donations";
import { logger } from "./logger";
import { push } from "@/lib/messages";

const SETTINGS_ID = "singleton";

const QUIZ_PUSH_PAYLOAD = {
  title: push.title,
  body: "🧠 سؤال ثقافي جديد بانتظارك!",
  url: "/quiz",
};

export async function isQuizEligible(userId: string): Promise<boolean> {
  const member = await prisma.member.findFirst({
    where: { userId, status: "ACTIVE", paidAmount: { gte: MEMBERSHIP_FEE } },
    select: { id: true },
  });
  return !!member;
}

async function getEligibleUserIds(): Promise<string[]> {
  const members = await prisma.member.findMany({
    where: { status: "ACTIVE", paidAmount: { gte: MEMBERSHIP_FEE }, userId: { not: null } },
    select: { userId: true },
    distinct: ["userId"],
  });
  return members.map((m) => m.userId as string);
}

export async function getQuizSettings() {
  const existing = await prisma.quizSettings.findUnique({ where: { id: SETTINGS_ID } });
  if (existing) return existing;

  return prisma.quizSettings
    .create({ data: { id: SETTINGS_ID } })
    .catch(() => prisma.quizSettings.findUniqueOrThrow({ where: { id: SETTINGS_ID } }));
}

export async function updateQuizSettings(data: {
  defaultAnswerCount?: number;
  defaultCorrectCount?: number;
  defaultPoints?: number;
  questionsPerDay?: number;
}) {
  return prisma.quizSettings.upsert({
    where: { id: SETTINGS_ID },
    update: data,
    create: { id: SETTINGS_ID, ...data },
  });
}

function todayUTC(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

function isSameUTCDay(a: Date, b: Date): boolean {
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth() &&
    a.getUTCDate() === b.getUTCDate()
  );
}

export async function touchUserActivity(userId: string): Promise<void> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { lastActiveDate: true, currentStreak: true, longestStreak: true },
  });
  if (!user) return;

  const today = todayUTC();
  if (user.lastActiveDate && isSameUTCDay(user.lastActiveDate, today)) return;

  const yesterday = new Date(today);
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  const continuesStreak = user.lastActiveDate
    ? isSameUTCDay(user.lastActiveDate, yesterday)
    : false;

  const currentStreak = continuesStreak ? user.currentStreak + 1 : 1;
  const longestStreak = Math.max(user.longestStreak, currentStreak);

  await prisma.user.update({
    where: { id: userId },
    data: { lastActiveDate: today, currentStreak, longestStreak },
  });
}

interface QuizLeaderboardEntry {
  rank: number;
  userId: string;
  name: string;
  photoUrl: string | null;
  total: number;
  currentStreak: number;
  longestStreak: number;
}

export async function getQuizLeaderboard(limit?: number): Promise<QuizLeaderboardEntry[]> {
  const eligibleUserIds = await getEligibleUserIds();
  const [users, totals] = await Promise.all([
    prisma.user.findMany({
      where: { id: { in: eligibleUserIds } },
      select: {
        id: true,
        currentStreak: true,
        longestStreak: true,
        members: {
          select: { fullName: true, photo: true },
          orderBy: { createdAt: "asc" },
          take: 1,
        },
      },
    }),
    prisma.quizAssignment.groupBy({ by: ["userId"], _sum: { pointsAwarded: true } }),
  ]);

  const totalByUser = new Map(totals.map((t) => [t.userId, t._sum.pointsAwarded ?? 0]));

  const ranked = users
    .map((u) => {
      const member = u.members[0];
      return {
        userId: u.id,
        name: member?.fullName ?? "مستخدم",
        photoUrl: member?.photo ? `/api/files/member/${member.photo}` : null,
        total: totalByUser.get(u.id) ?? 0,
        currentStreak: u.currentStreak,
        longestStreak: u.longestStreak,
      };
    })
    .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name, "ar"))
    .map((e, i) => ({ rank: i + 1, ...e }));

  return typeof limit === "number" ? ranked.slice(0, limit) : ranked;
}

export async function getUserQuizStanding(userId: string) {
  const leaderboard = await getQuizLeaderboard();
  const totalParticipants = leaderboard.length;
  const entry = leaderboard.find((e) => e.userId === userId);
  return {
    totalPoints: entry?.total ?? 0,
    rank: entry?.rank ?? totalParticipants,
    totalParticipants,
    top10: leaderboard.slice(0, 10),
  };
}

export async function getPendingAssignments(userId: string) {
  return prisma.quizAssignment.findMany({
    where: { userId, answeredAt: null },
    orderBy: { sentAt: "asc" },
    select: {
      id: true,
      sentAt: true,
      question: {
        select: {
          id: true,
          text: true,
          category: true,
          points: true,
          correctCount: true,
          answers: { select: { id: true, text: true, order: true }, orderBy: { order: "asc" } },
        },
      },
    },
  });
}

export function computeIsCorrect(correctAnswerIds: string[], selectedAnswerIds: string[]): boolean {
  const correctSet = new Set(correctAnswerIds);
  const selectedSet = new Set(selectedAnswerIds);
  return correctSet.size === selectedSet.size && [...correctSet].every((id) => selectedSet.has(id));
}

function shuffle<T>(input: T[]): T[] {
  const arr = [...input];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

async function pushToAssignedUsers(userIds: string[]) {
  await Promise.all(
    userIds.map((uid) =>
      sendPushToUser(uid, QUIZ_PUSH_PAYLOAD).catch((err) => logger.error("quiz.push.error", err)),
    ),
  );
}

export async function sendSameQuestionToAll(
  questionId: string,
): Promise<{ sentCount: number; skippedCount: number }> {
  const question = await prisma.quizQuestion.findUnique({
    where: { id: questionId },
    select: { id: true },
  });
  if (!question) throw new Error("QUESTION_NOT_FOUND");

  const eligibleUserIds = await getEligibleUserIds();
  const [users, alreadySent] = await Promise.all([
    prisma.user.findMany({ where: { id: { in: eligibleUserIds } }, select: { id: true } }),
    prisma.quizAssignment.findMany({ where: { questionId }, select: { userId: true } }),
  ]);
  const alreadySentIds = new Set(alreadySent.map((a) => a.userId));
  const targets = users.filter((u) => !alreadySentIds.has(u.id));

  if (targets.length === 0) {
    return { sentCount: 0, skippedCount: users.length };
  }

  const batchId = randomUUID();
  await prisma.quizAssignment.createMany({
    data: targets.map((u) => ({ userId: u.id, questionId, batchId, mode: "SAME" })),
  });
  await pushToAssignedUsers(targets.map((u) => u.id));

  return { sentCount: targets.length, skippedCount: users.length - targets.length };
}

export async function sendRandomBatch(
  count: number,
): Promise<{ sentCount: number; skippedCount: number }> {
  const eligibleUserIds = await getEligibleUserIds();
  const [users, activeQuestions, existingAssignments] = await Promise.all([
    prisma.user.findMany({ where: { id: { in: eligibleUserIds } }, select: { id: true } }),
    prisma.quizQuestion.findMany({ where: { active: true }, select: { id: true } }),
    prisma.quizAssignment.findMany({ select: { userId: true, questionId: true } }),
  ]);

  const seenByUser = new Map<string, Set<string>>();
  for (const a of existingAssignments) {
    if (!seenByUser.has(a.userId)) seenByUser.set(a.userId, new Set());
    seenByUser.get(a.userId)!.add(a.questionId);
  }

  const allQuestionIds = activeQuestions.map((q) => q.id);
  const batchId = randomUUID();
  const rows: { userId: string; questionId: string; batchId: string; mode: string }[] = [];

  for (const user of users) {
    const seen = seenByUser.get(user.id) ?? new Set<string>();
    const pool = shuffle(allQuestionIds.filter((id) => !seen.has(id)));
    for (const questionId of pool.slice(0, count)) {
      rows.push({ userId: user.id, questionId, batchId, mode: "RANDOM" });
    }
  }

  if (rows.length === 0) {
    return { sentCount: 0, skippedCount: users.length };
  }

  await prisma.quizAssignment.createMany({ data: rows, skipDuplicates: true });

  const assignedUserIds = Array.from(new Set(rows.map((r) => r.userId)));
  await pushToAssignedUsers(assignedUserIds);

  return { sentCount: assignedUserIds.length, skippedCount: users.length - assignedUserIds.length };
}

export async function runDailyQuizAutoSend(): Promise<void> {
  const settings = await getQuizSettings();
  const today = todayUTC();
  if (settings.lastAutoSendDate && isSameUTCDay(settings.lastAutoSendDate, today)) return;

  const activeCount = await prisma.quizQuestion.count({ where: { active: true } });
  if (activeCount === 0) return;

  if (!(await claimAutoSend(today))) return;

  await sendRandomBatch(settings.questionsPerDay);
}

async function claimAutoSend(today: Date): Promise<boolean> {
  const claimed = await prisma.quizSettings.updateMany({
    where: {
      id: SETTINGS_ID,
      OR: [{ lastAutoSendDate: null }, { lastAutoSendDate: { lt: today } }],
    },
    data: { lastAutoSendDate: today },
  });
  return claimed.count === 1;
}
