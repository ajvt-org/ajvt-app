import { prisma } from "./prisma";
import { sendPushToUsers } from "./push";
import { logger } from "./logger";
import { notify } from "@/lib/messages";
import type { CategoryKey } from "./notificationCategories";

export async function notifyTeams(
  homeTeamId: string,
  awayTeamId: string,
  payload: { title: string; body: string; url?: string },
  category: CategoryKey = "TOURNAMENT_MATCH",
) {
  const [teamMembers, followers] = await Promise.all([
    prisma.teamMember.findMany({
      where: { teamId: { in: [homeTeamId, awayTeamId] } },
      select: { userId: true },
    }),
    prisma.teamFollow.findMany({
      where: { teamId: { in: [homeTeamId, awayTeamId] } },
      select: { userId: true },
    }),
  ]);
  const userIds = Array.from(
    new Set(
      [...teamMembers.map((tm) => tm.userId), ...followers.map((f) => f.userId)].filter(
        (id): id is string => id !== null,
      ),
    ),
  );
  await sendPushToUsers(userIds, payload, category).catch((err) =>
    logger.error("tournament.push.error", err),
  );
}

export async function notifyActivityFollowers(
  activityId: string,
  payload: { title: string; body: string; url?: string },
  category: CategoryKey = "TOURNAMENT_MATCH",
) {
  const teams = await prisma.team.findMany({
    where: { activityId },
    select: { id: true },
  });
  const teamIds = teams.map((t) => t.id);
  const [teamMembers, followers] = await Promise.all([
    prisma.teamMember.findMany({
      where: { teamId: { in: teamIds } },
      select: { userId: true },
    }),
    prisma.teamFollow.findMany({
      where: { teamId: { in: teamIds } },
      select: { userId: true },
    }),
  ]);
  const userIds = Array.from(
    new Set(
      [...teamMembers.map((tm) => tm.userId), ...followers.map((f) => f.userId)].filter(
        (id): id is string => id !== null,
      ),
    ),
  );
  await sendPushToUsers(userIds, payload, category).catch((err) =>
    logger.error("tournament.push.error", err),
  );
}

const REMINDER_WINDOW_MS = 36 * 60 * 60 * 1000;

export async function sendMatchReminders() {
  const now = new Date();
  const windowEnd = new Date(now.getTime() + REMINDER_WINDOW_MS);

  const matches = await prisma.match.findMany({
    where: {
      status: "SCHEDULED",
      reminderSentAt: null,
      matchDate: { gte: now, lte: windowEnd },
    },
    select: {
      id: true,
      homeTeamId: true,
      awayTeamId: true,
      homeTeam: { select: { name: true } },
      awayTeam: { select: { name: true } },
      activityId: true,
    },
  });

  for (const m of matches) {
    if (!(await claimReminder(m.id, now))) continue;

    await notifyTeams(
      m.homeTeamId,
      m.awayTeamId,
      notify.matchReminder(m.homeTeam.name, m.awayTeam.name, m.activityId),
      "MATCH_REMINDER",
    ).catch((err) => logger.error("match.reminder.push.error", err));
  }
}

async function claimReminder(matchId: string, now: Date): Promise<boolean> {
  const claimed = await prisma.match.updateMany({
    where: { id: matchId, reminderSentAt: null },
    data: { reminderSentAt: now },
  });
  return claimed.count === 1;
}
