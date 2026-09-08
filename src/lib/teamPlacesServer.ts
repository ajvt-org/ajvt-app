import type { Prisma } from "@prisma/client";

type Db = Prisma.TransactionClient;

export async function appearedForTeam(db: Db, userId: string, teamId: string): Promise<boolean> {
  const [goals, bookings, kicks, candidacies] = await Promise.all([
    db.matchGoal.count({ where: { userId, teamId } }),
    db.matchBooking.count({ where: { userId, teamId } }),
    db.matchPenaltyKick.count({ where: { userId, teamId } }),
    db.mvpCandidate.count({
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
