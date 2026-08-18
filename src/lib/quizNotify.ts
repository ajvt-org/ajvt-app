import { prisma } from "./prisma";
import { sendPushToUser } from "./push";
import { logger } from "./logger";
import { push } from "@/lib/messages";
import { getCompetition } from "./competitionServer";
import { competitionDay, dayState } from "./quizDay";

export const RETIRED = "الإرسال اليدوي توقف، الأسئلة تُنشر تلقائياً عند فتح يوم المسابقة";

export const DAY_OPEN_PAYLOAD = {
  title: push.title,
  body: "أسئلة اليوم متاحة الآن، شارك قبل إغلاق الباب",
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

  const today = competitionDay(competition.startsOn, competition.days, now);
  if (!today) return 0;

  const state = dayState(
    competition.startsOn,
    competition.days,
    { publishMinutes: competition.publishMinutes, cutoffMinutes: competition.cutoffMinutes },
    now,
  );
  if (state !== "open") return 0;

  const day = await prisma.quizDay.findUnique({
    where: { competitionId_day: { competitionId: competition.id, day: today.day } },
    select: { id: true, announcedAt: true, _count: { select: { questions: true } } },
  });
  if (!day || day.announcedAt || day._count.questions === 0) return 0;

  const claimed = await prisma.quizDay.updateMany({
    where: { id: day.id, announcedAt: null },
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
