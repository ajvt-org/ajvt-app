import { prisma } from "./prisma";
import { sendPushToUser } from "./push";

export async function notifyTeams(
  homeTeamId: string,
  awayTeamId: string,
  payload: { title: string; body: string; url?: string }
) {
  const teamMembers = await prisma.teamMember.findMany({
    where: { teamId: { in: [homeTeamId, awayTeamId] } },
    select: { member: { select: { userId: true } } },
  });
  const userIds = Array.from(new Set(teamMembers.map((tm) => tm.member.userId)));
  await Promise.all(
    userIds.map((uid) => sendPushToUser(uid, payload).catch((err) => console.error("Tournament push error:", err)))
  );
}
