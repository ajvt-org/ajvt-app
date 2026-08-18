import { prisma } from "@/lib/prisma";
import { money } from "@/lib/messages";

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

export async function getLeaderboardData(): Promise<{ leaderboard: LeaderboardEntry[] }> {
  const donations = await prisma.donation.findMany({
    where: { status: "ACTIVE" },
    select: {
      id: true,
      amount: true,
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

  for (const d of donations) {
    const amount = d.amount ?? 0;
    const named = d.donorName?.trim();

    if (d.memberId && named) {
      const photoUrl = d.member?.photo ? `/api/files/member/${d.member.photo}` : null;
      add(`m:${d.memberId}`, { name: named, photoUrl, anonymous: false }, amount, d.memberId);
    } else if (!d.memberId && named) {
      const photoUrl = d.donorPhoto ? `/api/files/donation/${d.donorPhoto}` : null;
      add(`n:${named}`, { name: named, photoUrl, anonymous: false }, amount);
    } else if (d.memberId) {
      add(
        `a:${d.memberId}`,
        { name: money.anonymousDonor, photoUrl: null, anonymous: true },
        amount,
        d.memberId,
      );
    } else {
      add(`a:${d.id}`, { name: money.anonymousDonor, photoUrl: null, anonymous: true }, amount);
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
