import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import { sortTeamPlaces, teamsLeftEmpty, type TeamPlace } from "../src/lib/teamPlaces";

async function appearedIn(userId: string, teamId: string): Promise<boolean> {
  const [goals, bookings, kicks, candidacies] = await Promise.all([
    prisma.matchGoal.count({ where: { userId, teamId } }),
    prisma.matchBooking.count({ where: { userId, teamId } }),
    prisma.matchPenaltyKick.count({ where: { userId, teamId } }),
    prisma.mvpCandidate.count({
      where: {
        userId,
        vote: {
          match: {
            OR: [
              { homeTeamId: teamId },
              { awayTeamId: teamId },
              { sideATeamId: teamId },
              { sideBTeamId: teamId },
            ],
          },
        },
      },
    }),
  ]);
  return goals + bookings + kicks + candidacies > 0;
}

async function strayPlaces(): Promise<TeamPlace[]> {
  const rows = await prisma.teamMember.findMany({
    select: {
      id: true,
      userId: true,
      teamId: true,
      team: { select: { activityId: true, captainUserId: true } },
    },
  });

  const places: TeamPlace[] = [];
  for (const row of rows) {
    const registered = await prisma.activityRegistration.count({
      where: { userId: row.userId, activityId: row.team.activityId },
    });
    if (registered > 0) continue;
    places.push({
      id: row.id,
      userId: row.userId,
      teamId: row.teamId,
      captain: row.team.captainUserId === row.userId,
      appeared: await appearedIn(row.userId, row.teamId),
    });
  }
  return places;
}

async function sizesOf(teamIds: string[]): Promise<Map<string, number>> {
  const grouped = await prisma.teamMember.groupBy({
    by: ["teamId"],
    where: { teamId: { in: teamIds } },
    _count: { _all: true },
  });
  return new Map(grouped.map((row) => [row.teamId, row._count._all]));
}

async function main() {
  const apply = process.argv.includes("--apply");

  const places = await strayPlaces();
  const { remove, captains, appeared } = sortTeamPlaces(places);
  const emptied = teamsLeftEmpty(remove, await sizesOf(remove.map((place) => place.teamId)));

  console.log(`Places on a team with no registration for that activity: ${places.length}`);
  console.log(`Of those, plain places this would remove: ${remove.length}`);
  console.log(`Of those, held by the captain of the team, left alone: ${captains.length}`);
  console.log(`Of those, held by somebody who has played, left alone: ${appeared.length}`);
  console.log(`Teams this would leave with nobody on them: ${emptied.length}`);
  console.log("A team with nobody on it is kept. Emptying is not a reason to delete it.");

  if (!apply) {
    console.log("Dry run. Pass --apply to write.");
    return;
  }

  const removed = await prisma.teamMember.deleteMany({
    where: { id: { in: remove.map((place) => place.id) } },
  });
  console.log(`Places removed: ${removed.count}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
