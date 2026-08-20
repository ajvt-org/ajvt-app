import { prisma } from "./prisma";
import { MEMBERSHIP_FEE } from "./donations";

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
  confirmAnswers?: boolean;
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

export function computeIsCorrect(correctAnswerIds: string[], selectedAnswerIds: string[]): boolean {
  const correctSet = new Set(correctAnswerIds);
  const selectedSet = new Set(selectedAnswerIds);
  return correctSet.size === selectedSet.size && [...correctSet].every((id) => selectedSet.has(id));
}
