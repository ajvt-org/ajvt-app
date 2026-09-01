import { prisma } from "./client";
import { forfeitScore } from "../../src/lib/forfeit";

export async function seedForfeit(activityId: string) {
  const match = await prisma.match.findFirst({
    where: {
      activityId,
      status: "PLAYED",
      homeScore: { gt: 0 },
      awayScore: { gt: 0 },
      forfeitWinnerTeamId: null,
    },
    orderBy: { order: "asc" },
    select: { id: true, homeTeamId: true, awayTeamId: true, homeScore: true, awayScore: true },
  });
  if (!match) return null;
  if (match.homeTeamId === null || match.awayTeamId === null) return null;

  const winnerTeamId = match.awayTeamId;
  const score = forfeitScore(
    { home: match.homeScore ?? 0, away: match.awayScore ?? 0 },
    winnerTeamId,
    match.homeTeamId,
  );

  await prisma.match.update({
    where: { id: match.id },
    data: { forfeitWinnerTeamId: winnerTeamId, homeScore: score.home, awayScore: score.away },
  });
  return { matchId: match.id, score };
}
