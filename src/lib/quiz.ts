import type { Prisma } from "@prisma/client";
import { prisma } from "./prisma";
import { MEMBERSHIP_FEE } from "./donations";
import { nameOf } from "./person";
import { asMembershipState, latestByAccount } from "./currentMembership";
import { currentMembership } from "./currentMembershipServer";
import { holdsMembership, membershipState } from "./membershipState";
import { getAppSettings } from "./settingsServer";
import type { ScoreCurve } from "./competitionConfig";

const SETTINGS_ID = "singleton";

const COVERS_THE_FEE = {
  status: "ACTIVE",
  purpose: "MEMBERSHIP",
  amount: { gte: MEMBERSHIP_FEE },
} satisfies Prisma.PaymentWhereInput;

export async function isQuizEligible(userId: string): Promise<boolean> {
  const [current, { membershipYear }] = await Promise.all([
    currentMembership(prisma, userId),
    getAppSettings(),
  ]);
  if (!holdsMembership(membershipState(asMembershipState(current), membershipYear))) return false;

  const paid = await prisma.payment.findFirst({
    where: { userId, ...COVERS_THE_FEE },
    select: { id: true },
  });
  return !!paid;
}

export async function eligibleMembers() {
  const [rows, { membershipYear }] = await Promise.all([
    prisma.membership.findMany({
      where: { user: { payments: { some: COVERS_THE_FEE } } },
      select: {
        userId: true,
        year: true,
        status: true,
        endedAt: true,
        user: { select: { fullName: true } },
      },
      orderBy: { user: { fullName: "asc" } },
    }),
    getAppSettings(),
  ]);
  return [...latestByAccount(rows).values()]
    .filter((row) => holdsMembership(membershipState(asMembershipState(row), membershipYear)))
    .map((row) => ({ userId: row.userId, fullName: nameOf(row.user) }));
}

export async function getQuizSettings() {
  const existing = await prisma.quizSettings.findUnique({ where: { id: SETTINGS_ID } });
  if (existing) return existing;

  return prisma.quizSettings
    .create({ data: { id: SETTINGS_ID } })
    .catch(() => prisma.quizSettings.findUniqueOrThrow({ where: { id: SETTINGS_ID } }));
}

export function tutorialCurve(settings: {
  tutorialFullSeconds: number;
  tutorialMaxSeconds: number;
  tutorialFloorPercent: number;
}): ScoreCurve {
  return {
    fullSeconds: settings.tutorialFullSeconds,
    maxSeconds: settings.tutorialMaxSeconds,
    floorPercent: settings.tutorialFloorPercent,
  };
}

export async function updateQuizSettings(data: {
  defaultAnswerCount?: number;
  defaultCorrectCount?: number;
  defaultPoints?: number;
  confirmAnswers?: boolean;
  tutorialFullSeconds?: number;
  tutorialMaxSeconds?: number;
  tutorialFloorPercent?: number;
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
