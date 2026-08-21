import { prisma } from "./prisma";
import { sendPushToUsers } from "./push";
import { logger } from "./logger";
import { push } from "@/lib/messages";
import { eligibleMembers } from "./quiz";
import { shapeOf } from "./competitionServer";
import { currentRound } from "./quizRound";

export const RETIRED = "الإرسال اليدوي توقف، الأسئلة تُنشر تلقائياً عند فتح يوم المسابقة";

export const DAY_OPEN_PAYLOAD = {
  title: push.title,
  body: "أسئلة الجولة متاحة الآن، شارك قبل إغلاق الباب",
  url: "/quiz",
};

export async function eligibleUserIds(): Promise<string[]> {
  return (await eligibleMembers()).map((m) => m.userId);
}

export async function announceOpenDay(now = new Date()): Promise<number> {
  const running = await prisma.competition.findMany({ where: { startedAt: { not: null } } });
  let sent = 0;
  for (const competition of running) sent += await announceFor(competition, now);
  return sent;
}

async function announceFor(
  competition: {
    id: string;
    visibility: string;
    startsAt: Date;
    roundCount: number;
    roundPeriodMinutes: number;
    roundWindowMinutes: number;
  },
  now: Date,
): Promise<number> {
  const open = currentRound(shapeOf(competition), now);
  if (!open) return 0;

  const round = await prisma.quizRound.findUnique({
    where: { competitionId_index: { competitionId: competition.id, index: open.index } },
    select: { id: true, announcedAt: true, _count: { select: { questions: true } } },
  });
  if (!round || round.announcedAt || round._count.questions === 0) return 0;

  const claimed = await prisma.quizRound.updateMany({
    where: { id: round.id, announcedAt: null },
    data: { announcedAt: now },
  });
  if (claimed.count === 0) return 0;

  const eligible = await eligibleUserIds();
  let targets = eligible;
  if (competition.visibility !== "PUBLIC") {
    const listed = new Set(
      (
        await prisma.quizParticipant.findMany({
          where: { competitionId: competition.id },
          select: { userId: true },
        })
      ).map((p) => p.userId),
    );
    targets = eligible.filter((userId) => listed.has(userId));
  }
  await sendPushToUsers(targets, DAY_OPEN_PAYLOAD, "QUIZ_ROUND").catch((err) =>
    logger.error("quiz.day.push.error", err),
  );
  return targets.length;
}
