import { randomUUID } from "crypto";
import { prisma } from "./prisma";
import { sendPushToUser } from "./push";
import { MEMBERSHIP_FEE } from "./donations";
import { logger } from "./logger";

const QUIZ_PUSH_PAYLOAD = {
  title: "رابطة شباب التاكلالت",
  body: "🧠 سؤال ثقافي جديد بانتظارك!",
  url: "/quiz",
};

// --- Eligibility ---
// Only paid-up members ("منتسب") can play: a User needs at least one Member
// that's ACTIVE (admin-approved) with paidAmount covering the membership fee.
// Someone who never joined, is still pending, was rejected, or is active
// without having paid can't play or be sent questions.

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

// --- Settings (singleton row, same idiom as Counter) ---

export async function getQuizSettings() {
  return prisma.quizSettings.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton" },
  });
}

export async function updateQuizSettings(data: {
  defaultAnswerCount?: number;
  defaultCorrectCount?: number;
  defaultPoints?: number;
  questionsPerDay?: number;
}) {
  return prisma.quizSettings.upsert({
    where: { id: "singleton" },
    update: data,
    create: { id: "singleton", ...data },
  });
}

// --- Streak ("flame") ---
// The association is based in Mauritania (UTC+0 year-round, no DST), so
// comparing calendar days in UTC matches local days with no offset math.

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
  if (user.lastActiveDate && isSameUTCDay(user.lastActiveDate, today)) return; // already counted today

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

// --- Leaderboard / rank ---
// Ranks every quiz-eligible User (not just those with assignments so far) —
// someone who hasn't received a question yet still has a rank (last place).
// Users who aren't eligible (not a paid-up member) never appear here.

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

// --- Pending questions for a user ---

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

// --- Scoring ---

export function computeIsCorrect(correctAnswerIds: string[], selectedAnswerIds: string[]): boolean {
  const correctSet = new Set(correctAnswerIds);
  const selectedSet = new Set(selectedAnswerIds);
  return correctSet.size === selectedSet.size && [...correctSet].every((id) => selectedSet.has(id));
}

// --- Sending ---

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

// Sends the same question to every eligible user who hasn't already received it.
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

// Sends up to `count` distinct, never-before-seen active questions to every
// eligible user, picked independently per user so no two users necessarily
// get the same set — and no user ever receives a question twice (enforced both by
// the in-memory "seen" filter here and, belt-and-suspenders, by the
// @@unique([userId, questionId]) constraint via skipDuplicates).
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

// Opportunistic daily auto-send — mirrors sendMatchReminders() in
// tournamentNotify.ts. No cron on this deployment (see railway.toml), so the
// first user to hit /api/quiz/me on a given day triggers that day's batch.
export async function runDailyQuizAutoSend(): Promise<void> {
  const settings = await getQuizSettings();
  const today = todayUTC();
  if (settings.lastAutoSendDate && isSameUTCDay(settings.lastAutoSendDate, today)) return;

  // Don't burn today's slot if there's nothing active to send yet (e.g. the
  // admin hasn't authored any questions this early in the day) — otherwise
  // the first visit of the day claims the run with zero results and no one
  // gets a question until tomorrow, even after questions are added later.
  const activeCount = await prisma.quizQuestion.count({ where: { active: true } });
  if (activeCount === 0) return;

  // Claim today's run before the heavy lifting so a second near-simultaneous
  // request (a different user opening the app around the same moment)
  // doesn't trigger a duplicate batch.
  await prisma.quizSettings.update({
    where: { id: "singleton" },
    data: { lastAutoSendDate: today },
  });

  await sendRandomBatch(settings.questionsPerDay);
}
