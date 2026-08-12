import { prisma } from "@/lib/prisma";
import { MEMBERSHIP_FEE } from "@/lib/donations";
import type { Prisma, PrismaClient } from "@prisma/client";

type Db = PrismaClient | Prisma.TransactionClient;

// Keeps the auto-generated "membership surplus" Donation row (source:
// MEMBERSHIP) in sync with a Member's current status/paidAmount. Call after
// every write that touches either field. Idempotent, safe to call
// unconditionally — creates/updates/deletes as needed.
export async function syncMembershipDonation(db: Db, memberId: string) {
  const member = await db.member.findUnique({
    where: { id: memberId },
    select: { status: true, paidAmount: true, fullName: true, paymentProof: true, paymentMethod: true },
  });
  if (!member) return;

  const surplus = member.status === "ACTIVE" && member.paidAmount
    ? member.paidAmount - MEMBERSHIP_FEE
    : 0;

  const existing = await db.donation.findFirst({
    where: { memberId, source: "MEMBERSHIP" },
    select: { id: true },
  });

  if (surplus > 0) {
    const data = { amount: surplus, donorName: member.fullName, proof: member.paymentProof, paymentMethod: member.paymentMethod };
    if (existing) {
      await db.donation.update({ where: { id: existing.id }, data });
    } else {
      await db.donation.create({ data: { ...data, memberId, source: "MEMBERSHIP", status: "ACTIVE" } });
    }
  } else if (existing) {
    await db.donation.delete({ where: { id: existing.id } });
  }
}

interface LeaderboardEntry {
  rank: number;
  name: string;
  photoUrl: string | null;
  total: number;
}

export async function getLeaderboardData(): Promise<{ leaderboard: LeaderboardEntry[]; anonymousTotal: number }> {
  const donations = await prisma.donation.findMany({
    where: { status: "ACTIVE" },
    select: {
      amount: true,
      donorName: true,
      donorPhoto: true,
      memberId: true,
      member: { select: { fullName: true, photo: true } },
    },
  });

  const byKey = new Map<string, { name: string; photoUrl: string | null; total: number }>();
  let anonymousTotal = 0;

  for (const d of donations) {
    const amount = d.amount ?? 0;
    // memberId set + donorName present -> attributed & shown with the
    // member's own account photo (whether from the automatic membership
    // surplus or a logged-in donation they chose to attribute to themselves).
    // memberId set + donorName null -> the member explicitly chose to stay
    // anonymous for this donation; don't out them just because we know who
    // they are internally.
    if (d.memberId && d.donorName) {
      const key = `m:${d.memberId}`;
      const photoUrl = d.member?.photo ? `/api/files/member/${d.member.photo}` : null;
      const entry = byKey.get(key) ?? { name: d.donorName, photoUrl, total: 0 };
      entry.total += amount;
      byKey.set(key, entry);
    } else if (!d.memberId && d.donorName?.trim()) {
      const key = `n:${d.donorName.trim()}`;
      const photoUrl = d.donorPhoto ? `/api/files/donation/${d.donorPhoto}` : null;
      const entry = byKey.get(key) ?? { name: d.donorName.trim(), photoUrl, total: 0 };
      if (!entry.photoUrl && photoUrl) entry.photoUrl = photoUrl;
      entry.total += amount;
      byKey.set(key, entry);
    } else {
      anonymousTotal += amount;
    }
  }

  const leaderboard = [...byKey.values()]
    .sort((a, b) => b.total - a.total)
    .map((e, i) => ({ rank: i + 1, ...e }));

  return { leaderboard, anonymousTotal };
}
