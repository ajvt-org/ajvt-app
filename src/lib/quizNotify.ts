import { prisma } from "./prisma";
import { sendPushToUser } from "./push";
import { logger } from "./logger";
import { push } from "@/lib/messages";
import { getCompetition, shapeOf } from "./competitionServer";
import { currentRound } from "./quizRound";

export const RETIRED = "الإرسال اليدوي توقف، الأسئلة تُنشر تلقائياً عند فتح يوم المسابقة";

export const DAY_OPEN_PAYLOAD = {
  title: push.title,
  body: "أسئلة الجولة متاحة الآن، شارك قبل إغلاق الباب",
  url: "/quiz",
};

export async function eligibleUserIds(): Promise<string[]> {
  const members = await prisma.member.findMany({
    where: { status: "ACTIVE", userId: { not: null } },
    select: { userId: true },
    distinct: ["userId"],
  });
  return members.map((m) => m.userId as string);
}

export async function announceOpenDay(now = new Date()): Promise<number> {
  const competition = await getCompetition();
  if (!competition?.startedAt) return 0;

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

  const targets = await eligibleUserIds();
  await Promise.all(
    targets.map((userId) =>
      sendPushToUser(userId, DAY_OPEN_PAYLOAD).catch((err) =>
        logger.error("quiz.day.push.error", err),
      ),
    ),
  );
  return targets.length;
}
