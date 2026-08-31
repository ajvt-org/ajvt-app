import { prisma } from "@/lib/prisma";
import { money } from "@/lib/messages";
import { splitPayment } from "@/lib/membershipPayment";
import { attributedDonorName } from "@/lib/donorName";
import { orderSupporters } from "@/lib/supportersOrder";

export const SUPPORTERS_PAGE_SIZE = 20;

export type PublicLeaderboardEntry = Omit<LeaderboardEntry, "accountIds">;

export function toPublicEntry(e: LeaderboardEntry): PublicLeaderboardEntry {
  return {
    rank: e.rank,
    position: e.position,
    name: e.name,
    photoUrl: e.photoUrl,
    total: e.total,
    anonymous: e.anonymous,
  };
}

interface LeaderboardEntry {
  rank: number;
  position: number;
  name: string;
  photoUrl: string | null;
  total: number;
  accountIds: string[];
  anonymous: boolean;
}

export async function getLeaderboardData(): Promise<{ leaderboard: LeaderboardEntry[] }> {
  const payments = await prisma.payment.findMany({
    where: { status: "ACTIVE" },
    select: {
      id: true,
      purpose: true,
      amount: true,
      feeApplied: true,
      anonymous: true,
      donorName: true,
      donorPhoto: true,
      createdAt: true,
      userId: true,
      user: { select: { fullName: true, photo: true } },
    },
  });

  type Row = {
    name: string;
    photoUrl: string | null;
    total: number;
    reachedAt: Date;
    accountIds: Set<string>;
    anonymous: boolean;
  };
  const byKey = new Map<string, Row>();

  function add(
    key: string,
    row: Omit<Row, "accountIds" | "total" | "reachedAt">,
    amount: number,
    at: Date,
    accountId?: string | null,
  ) {
    const entry = byKey.get(key) ?? {
      ...row,
      total: 0,
      reachedAt: at,
      accountIds: new Set<string>(),
    };
    entry.total += amount;
    if (at > entry.reachedAt) entry.reachedAt = at;
    if (!entry.photoUrl && row.photoUrl) entry.photoUrl = row.photoUrl;
    if (accountId) entry.accountIds.add(accountId);
    byKey.set(key, entry);
  }

  for (const p of payments) {
    const amount =
      p.purpose === "MEMBERSHIP" ? splitPayment(p.amount, p.feeApplied ?? 0).surplus : p.amount;
    if (p.purpose === "MEMBERSHIP" && amount === 0) continue;
    const named = p.anonymous ? null : attributedDonorName(p);

    if (p.userId && named) {
      const photoUrl = p.user?.photo ? `/api/files/member/${p.user.photo}` : null;
      add(
        `m:${p.userId}`,
        { name: named, photoUrl, anonymous: false },
        amount,
        p.createdAt,
        p.userId,
      );
    } else if (named) {
      const photoUrl = p.donorPhoto ? `/api/files/donation/${p.donorPhoto}` : null;
      add(`n:${named}`, { name: named, photoUrl, anonymous: false }, amount, p.createdAt);
    } else if (p.userId) {
      add(
        `a:${p.userId}`,
        { name: money.anonymousDonor, photoUrl: null, anonymous: true },
        amount,
        p.createdAt,
        p.userId,
      );
    } else {
      add(
        `a:${p.id}`,
        { name: money.anonymousDonor, photoUrl: null, anonymous: true },
        amount,
        p.createdAt,
      );
    }
  }

  const rows = [...byKey.entries()].map(([key, row]) => ({ ...row, key }));

  const leaderboard = orderSupporters(rows).map((e) => ({
    rank: e.position,
    position: e.position,
    name: e.name,
    photoUrl: e.photoUrl,
    total: e.total,
    accountIds: [...e.accountIds],
    anonymous: e.anonymous,
  }));

  return { leaderboard };
}
