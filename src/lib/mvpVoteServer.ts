import { prisma } from "./prisma";
import { isVoteClosed, mvpWinner } from "./mvpVote";

export type SettleableMatch = {
  id: string;
  manOfTheMatchUserId: string | null;
  mvpVote: {
    status: "OPEN" | "CLOSED";
    closesAt: Date;
    candidates: { userId: string; _count: { votes: number } }[];
  } | null;
};

function winnerFor(match: SettleableMatch, now: Date): string | null {
  if (!match.mvpVote || match.manOfTheMatchUserId) return null;
  if (!isVoteClosed(match.mvpVote, now)) return null;
  return mvpWinner(
    match.mvpVote.candidates.map((c) => ({ memberId: c.userId, votes: c._count.votes })),
  );
}

export async function settleMvpVotes(
  matches: SettleableMatch[],
  now = new Date(),
): Promise<Map<string, string>> {
  const applied = new Map<string, string>();
  for (const match of matches) {
    const winner = winnerFor(match, now);
    if (winner) applied.set(match.id, winner);
  }
  if (applied.size === 0) return applied;

  await prisma.$transaction(
    [...applied].map(([matchId, userId]) =>
      prisma.match.updateMany({
        where: { id: matchId, manOfTheMatchUserId: null },
        data: { manOfTheMatchUserId: userId },
      }),
    ),
  );
  return applied;
}
