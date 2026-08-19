import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import {
  expireStaleAssignments,
  getQuizSettings,
  touchUserActivity,
  getPendingAssignments,
  getUserQuizStanding,
  isQuizEligible,
} from "@/lib/quiz";
import { prisma } from "@/lib/prisma";
import { withRoute } from "@/lib/route";
import { quiz } from "@/lib/messages";

export const GET = withRoute("GET /api/quiz/me", async () => {
  const session = await requireUser();

  if (!(await isQuizEligible(session.userId))) {
    return NextResponse.json({ error: quiz.paidMembersOnly, eligible: false }, { status: 403 });
  }

  await touchUserActivity(session.userId);
  const { answerWindowSeconds } = await getQuizSettings();
  await expireStaleAssignments(session.userId, answerWindowSeconds);

  const [pending, standing, user] = await Promise.all([
    getPendingAssignments(session.userId),
    getUserQuizStanding(session.userId),
    prisma.user.findUnique({
      where: { id: session.userId },
      select: { currentStreak: true, longestStreak: true },
    }),
  ]);

  return NextResponse.json({
    pending: pending.map((p) => ({
      id: p.id,
      sentAt: p.sentAt,
      revealedAt: p.revealedAt,
      question: p.question,
    })),
    totalPoints: standing.totalPoints,
    rank: standing.rank,
    totalParticipants: standing.totalParticipants,
    top10: standing.top10,
    streak: { current: user?.currentStreak ?? 0, longest: user?.longestStreak ?? 0 },
    answerWindowSeconds,
  });
});
