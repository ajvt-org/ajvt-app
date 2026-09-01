import { prisma } from "./prisma";
import { sendPushToUser, sendPushToUsers } from "./push";
import { isQuietHour } from "./quietHours";
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
      homeTeam: { select: { id: true, name: true } },
      awayTeam: { select: { id: true, name: true } },
      activityId: true,
    },
  });

  for (const m of matches) {
    if (m.homeTeam === null || m.awayTeam === null) continue;
    if (!(await claimReminder(m.id, now))) continue;

    await notifyTeams(
      m.homeTeam.id,
      m.awayTeam.id,
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

const TEAM_NUDGE_INTERVAL_MS = 60 * 60 * 1000;

export async function sendTeamChoiceReminders() {
  const now = new Date();
  if (isQuietHour(now)) return;
  const since = new Date(now.getTime() - TEAM_NUDGE_INTERVAL_MS);

  const waiting = await prisma.activityRegistration.findMany({
    where: {
      status: "ACTIVE",
      activity: { isTournament: true, isOpen: true },
      OR: [{ teamNudgeSentAt: null }, { teamNudgeSentAt: { lte: since } }],
    },
    select: {
      id: true,
      userId: true,
      activityId: true,
      activity: { select: { id: true, title: true, startsAt: true } },
    },
  });

  for (const registration of waiting) {
    if (registration.activity.startsAt && registration.activity.startsAt <= now) continue;
    const onATeam = await prisma.teamMember.count({
      where: { userId: registration.userId, team: { activityId: registration.activityId } },
    });
    if (onATeam > 0) continue;
    if (!(await claimTeamNudge(registration.id, now, since))) continue;

    await sendPushToUser(
      registration.userId,
      notify.teamChoiceReminder(registration.activity.title, registration.activity.id),
      "TEAM_CHOICE_REMINDER",
    ).catch((err) => logger.error("team.choice.reminder.push.error", err));
  }
}

async function claimTeamNudge(registrationId: string, now: Date, since: Date): Promise<boolean> {
  const claimed = await prisma.activityRegistration.updateMany({
    where: {
      id: registrationId,
      OR: [{ teamNudgeSentAt: null }, { teamNudgeSentAt: { lte: since } }],
    },
    data: { teamNudgeSentAt: now },
  });
  return claimed.count === 1;
}
