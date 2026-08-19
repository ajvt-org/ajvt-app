import { prisma } from "@/lib/prisma";
import { money } from "@/lib/messages";
import { splitPayment } from "@/lib/membershipPayment";

export const SUPPORTERS_PAGE_SIZE = 20;

export type PublicLeaderboardEntry = Omit<LeaderboardEntry, "memberIds">;

export function toPublicEntry(e: LeaderboardEntry): PublicLeaderboardEntry {
  return {
    rank: e.rank,
    name: e.name,
    photoUrl: e.photoUrl,
    total: e.total,
    anonymous: e.anonymous,
  };
}

interface LeaderboardEntry {
  rank: number;
  name: string;
  photoUrl: string | null;
  total: number;
  memberIds: string[];
  anonymous: boolean;
}

// The board counts support, not membership: a membership payment contributes only
// what it carried past the fee in force when it was taken.
export async function getLeaderboardData(): Promise<{ leaderboard: LeaderboardEntry[] }> {
  const payments = await prisma.payment.findMany({
    where: { status: "ACTIVE" },
    select: {
      id: true,
      purpose: true,
      amount: true,
      feeApplied: true,
      donorName: true,
      donorPhoto: true,
      memberId: true,
      member: { select: { fullName: true, photo: true } },
    },
  });

  type Row = {
    name: string;
    photoUrl: string | null;
    total: number;
    memberIds: Set<string>;
    anonymous: boolean;
  };
  const byKey = new Map<string, Row>();

  function add(
    key: string,
    row: Omit<Row, "memberIds" | "total">,
    amount: number,
    memberId?: string | null,
  ) {
    const entry = byKey.get(key) ?? { ...row, total: 0, memberIds: new Set<string>() };
    entry.total += amount;
    if (!entry.photoUrl && row.photoUrl) entry.photoUrl = row.photoUrl;
    if (memberId) entry.memberIds.add(memberId);
    byKey.set(key, entry);
  }

  for (const p of payments) {
    const amount =
      p.purpose === "MEMBERSHIP" ? splitPayment(p.amount, p.feeApplied ?? 0).surplus : p.amount;
    if (p.purpose === "MEMBERSHIP" && amount === 0) continue;
    const named = p.donorName?.trim();

    if (p.memberId && named) {
      const photoUrl = p.member?.photo ? `/api/files/member/${p.member.photo}` : null;
      add(`m:${p.memberId}`, { name: named, photoUrl, anonymous: false }, amount, p.memberId);
    } else if (!p.memberId && named) {
      const photoUrl = p.donorPhoto ? `/api/files/donation/${p.donorPhoto}` : null;
      add(`n:${named}`, { name: named, photoUrl, anonymous: false }, amount);
    } else if (p.memberId) {
      add(
        `a:${p.memberId}`,
        { name: money.anonymousDonor, photoUrl: null, anonymous: true },
        amount,
        p.memberId,
      );
    } else {
      add(`a:${p.id}`, { name: money.anonymousDonor, photoUrl: null, anonymous: true }, amount);
    }
  }

  const leaderboard = [...byKey.values()]
    .sort((a, b) => b.total - a.total)
    .map((e, i) => ({
      rank: i + 1,
      name: e.name,
      photoUrl: e.photoUrl,
      total: e.total,
      memberIds: [...e.memberIds],
      anonymous: e.anonymous,
    }));

  return { leaderboard };
}
