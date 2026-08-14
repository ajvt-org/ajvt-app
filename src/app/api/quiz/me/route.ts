import { NextResponse } from "next/server";
import { requireUser } from "@/lib/auth";
import {
  touchUserActivity,
  runDailyQuizAutoSend,
  getPendingAssignments,
  getUserQuizStanding,
  isQuizEligible,
} from "@/lib/quiz";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const session = await requireUser();

    if (!(await isQuizEligible(session.userId))) {
      return NextResponse.json(
        { error: "المسابقة متاحة فقط للمنتسبين الذين دفعوا رسوم الانتساب", eligible: false },
        { status: 403 },
      );
    }

    await touchUserActivity(session.userId);
    // Unlike sendMatchReminders() (fire-and-forget in /api/user/me), this is
    // awaited: if this is the first visit of the day, the freshly-generated
    // question(s) must show up in this very response, not on the next visit.
    await runDailyQuizAutoSend().catch((err) => console.error("Quiz auto-send error:", err));

    const [pending, standing, user] = await Promise.all([
      getPendingAssignments(session.userId),
      getUserQuizStanding(session.userId),
      prisma.user.findUnique({
        where: { id: session.userId },
        select: { currentStreak: true, longestStreak: true },
      }),
    ]);

    return NextResponse.json({
      pending: pending.map((p) => ({ id: p.id, sentAt: p.sentAt, question: p.question })),
      totalPoints: standing.totalPoints,
      rank: standing.rank,
      totalParticipants: standing.totalParticipants,
      top10: standing.top10,
      streak: { current: user?.currentStreak ?? 0, longest: user?.longestStreak ?? 0 },
    });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }
    console.error("Quiz me error:", err);
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}
