import { prisma } from "./prisma";
import { accountsFor } from "./memberAccount";
import { isVoteClosed, mvpWinner } from "./mvpVote";

export type SettleableMatch = {
  id: string;
  manOfTheMatchId: string | null;
  mvpVote: {
    status: "OPEN" | "CLOSED";
    closesAt: Date;
    candidates: { memberId: string; _count: { votes: number } }[];
  } | null;
};

function winnerFor(match: SettleableMatch, now: Date): string | null {
  if (!match.mvpVote || match.manOfTheMatchId) return null;
  if (!isVoteClosed(match.mvpVote, now)) return null;
  return mvpWinner(
    match.mvpVote.candidates.map((c) => ({ memberId: c.memberId, votes: c._count.votes })),
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

  const accountOfMember = await accountsFor(prisma, [...applied.values()]);
  await prisma.$transaction(
    [...applied].map(([matchId, memberId]) =>
      prisma.match.updateMany({
        where: { id: matchId, manOfTheMatchId: null },
        data: {
          manOfTheMatchId: memberId,
          manOfTheMatchUserId: accountOfMember.get(memberId) ?? null,
        },
      }),
    ),
  );
  return applied;
}
