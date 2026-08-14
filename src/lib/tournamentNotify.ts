import { prisma } from "./prisma";
import { sendPushToUser } from "./push";

export async function notifyTeams(
  homeTeamId: string,
  awayTeamId: string,
  payload: { title: string; body: string; url?: string },
) {
  const [teamMembers, followers] = await Promise.all([
    prisma.teamMember.findMany({
      where: { teamId: { in: [homeTeamId, awayTeamId] } },
      select: { member: { select: { userId: true } } },
    }),
    prisma.teamFollow.findMany({
      where: { teamId: { in: [homeTeamId, awayTeamId] } },
      select: { userId: true },
    }),
  ]);
  const userIds = Array.from(
    new Set(
      [...teamMembers.map((tm) => tm.member.userId), ...followers.map((f) => f.userId)].filter(
        (id): id is string => id !== null,
      ),
    ),
  );
  await Promise.all(
    userIds.map((uid) =>
      sendPushToUser(uid, payload).catch((err) => console.error("Tournament push error:", err)),
    ),
  );
}

// No cron on this deployment (see railway.toml) — reminders are sent
// opportunistically the first time someone hits a hot endpoint after the
// match's reminder window opens, not at a fixed time before kickoff.
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
    await notifyTeams(m.homeTeamId, m.awayTeamId, {
      title: "رابطة شباب التاكلالت",
      body: `تذكير: مباراة فريقك غداً — ${m.homeTeam.name} × ${m.awayTeam.name}`,
      url: `/tournament/${m.activityId}`,
    }).catch((err) => console.error("Match reminder push error:", err));

    await prisma.match
      .update({ where: { id: m.id }, data: { reminderSentAt: now } })
      .catch((err) => console.error("Match reminder stamp error:", err));
  }
}
