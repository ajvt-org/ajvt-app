import { prisma } from "./prisma";
import { MEMBERSHIP_FEE } from "./donations";
import { GRACE_MS } from "./quizWindow";

const SETTINGS_ID = "singleton";

export async function isQuizEligible(userId: string): Promise<boolean> {
  const member = await prisma.member.findFirst({
    where: { userId, status: "ACTIVE", paidAmount: { gte: MEMBERSHIP_FEE } },
    select: { id: true },
  });
  return !!member;
}

export async function eligibleMembers() {
  const members = await prisma.member.findMany({
    where: { status: "ACTIVE", paidAmount: { gte: MEMBERSHIP_FEE }, userId: { not: null } },
    select: { userId: true, fullName: true },
    orderBy: { fullName: "asc" },
    distinct: ["userId"],
  });
  return members.map((m) => ({ userId: m.userId as string, fullName: m.fullName }));
}

async function getEligibleUserIds(): Promise<string[]> {
  return (await eligibleMembers()).map((m) => m.userId);
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
  answerWindowSeconds?: number;
  minScorePercent?: number;
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

export async function expireStaleAssignments(
  userId: string,
  windowSeconds: number,
  now = new Date(),
): Promise<number> {
  const cutoff = new Date(now.getTime() - (windowSeconds * 1000 + GRACE_MS));
  const { count } = await prisma.quizAssignment.updateMany({
    where: { userId, answeredAt: null, revealedAt: { lt: cutoff } },
    data: { answeredAt: now, isCorrect: false, pointsAwarded: 0 },
  });
  return count;
}

export async function getPendingAssignments(userId: string) {
  const assignments = await prisma.quizAssignment.findMany({
    where: { userId, answeredAt: null },
    orderBy: { sentAt: "asc" },
    select: {
      id: true,
      sentAt: true,
      revealedAt: true,
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

  return assignments.map((a) => ({
    id: a.id,
    sentAt: a.sentAt,
    revealedAt: a.revealedAt,
    question: {
      ...a.question,
      answers: a.revealedAt ? a.question.answers : [],
    },
  }));
}

export async function revealOptions(assignmentId: string, userId: string, now = new Date()) {
  const claimed = await prisma.quizAssignment.updateMany({
    where: { id: assignmentId, userId, answeredAt: null, revealedAt: null },
    data: { revealedAt: now },
  });

  const assignment = await prisma.quizAssignment.findFirst({
    where: { id: assignmentId, userId },
    select: {
      id: true,
      revealedAt: true,
      answeredAt: true,
      question: {
        select: {
          answers: { select: { id: true, text: true, order: true }, orderBy: { order: "asc" } },
        },
      },
    },
  });

  return { assignment, justRevealed: claimed.count === 1 };
}

export function computeIsCorrect(correctAnswerIds: string[], selectedAnswerIds: string[]): boolean {
  const correctSet = new Set(correctAnswerIds);
  const selectedSet = new Set(selectedAnswerIds);
  return correctSet.size === selectedSet.size && [...correctSet].every((id) => selectedSet.has(id));
}
