import { prisma } from "@/lib/prisma";
import { money } from "@/lib/messages";
import { splitPayment } from "@/lib/membershipPayment";
import { DONOR_ACCOUNT_SELECT, attributedDonorName } from "@/lib/donorName";
import type { SupportViewer } from "@/lib/supportPrivacy";
import { rankSupporters } from "@/lib/supportersOrder";

export const SUPPORTERS_PAGE_SIZE = 20;

export type SupportSource = "DONATION" | "MEMBERSHIP";

export type PublicLeaderboardEntry = Omit<LeaderboardEntry, "accountIds" | "sources"> & {
  sources?: SupportSource[];
};

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

export function toAdminEntry(e: LeaderboardEntry): PublicLeaderboardEntry {
  return { ...toPublicEntry(e), sources: e.sources };
}

interface LeaderboardEntry {
  rank: number;
  position: number;
  name: string;
  photoUrl: string | null;
  total: number;
  accountIds: string[];
  sources: SupportSource[];
  anonymous: boolean;
}

export async function getLeaderboardData(
  viewer: SupportViewer,
): Promise<{ leaderboard: LeaderboardEntry[] }> {
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
      user: { select: { ...DONOR_ACCOUNT_SELECT, photo: true } },
    },
  });

  type Row = {
    name: string;
    photoUrl: string | null;
    total: number;
    reachedAt: Date;
    accountIds: Set<string>;
    sources: Set<SupportSource>;
    anonymous: boolean;
  };
  const byKey = new Map<string, Row>();

  function add(
    key: string,
    row: Omit<Row, "accountIds" | "sources" | "total" | "reachedAt">,
    amount: number,
    at: Date,
    source: SupportSource,
    accountId?: string | null,
  ) {
    const entry = byKey.get(key) ?? {
      ...row,
      total: 0,
      reachedAt: at,
      accountIds: new Set<string>(),
      sources: new Set<SupportSource>(),
    };
    entry.total += amount;
    if (at > entry.reachedAt) entry.reachedAt = at;
    if (!entry.photoUrl && row.photoUrl) entry.photoUrl = row.photoUrl;
    if (accountId) entry.accountIds.add(accountId);
    entry.sources.add(source);
    byKey.set(key, entry);
  }

  for (const p of payments) {
    const amount =
      p.purpose === "MEMBERSHIP" ? splitPayment(p.amount, p.feeApplied ?? 0).surplus : p.amount;
    if (p.purpose === "MEMBERSHIP" && amount === 0) continue;
    const source: SupportSource = p.purpose === "MEMBERSHIP" ? "MEMBERSHIP" : "DONATION";
    const named = p.anonymous ? null : attributedDonorName(p, viewer);

    if (p.userId && named) {
      const photoUrl = p.user?.photo ? `/api/files/member/${p.user.photo}` : null;
      add(
        `m:${p.userId}`,
        { name: named, photoUrl, anonymous: false },
        amount,
        p.createdAt,
        source,
        p.userId,
      );
    } else if (named) {
      const photoUrl = p.donorPhoto ? `/api/files/donation/${p.donorPhoto}` : null;
      add(`n:${named}`, { name: named, photoUrl, anonymous: false }, amount, p.createdAt, source);
    } else if (p.userId) {
      add(
        `a:${p.userId}`,
        { name: money.anonymousDonor, photoUrl: null, anonymous: true },
        amount,
        p.createdAt,
        source,
        p.userId,
      );
    } else {
      add(
        `a:${p.id}`,
        { name: money.anonymousDonor, photoUrl: null, anonymous: true },
        amount,
        p.createdAt,
        source,
      );
    }
  }

  const rows = [...byKey.entries()].map(([key, row]) => ({ ...row, key }));

  const leaderboard = rankSupporters(rows).map((e) => ({
    rank: e.rank,
    position: e.position,
    name: e.name,
    photoUrl: e.photoUrl,
    total: e.total,
    accountIds: [...e.accountIds],
    sources: [...e.sources],
    anonymous: e.anonymous,
  }));

  return { leaderboard };
}
