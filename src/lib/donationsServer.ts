import { prisma } from "@/lib/prisma";
import { MEMBERSHIP_FEE } from "@/lib/donations";
import type { Prisma, PrismaClient } from "@prisma/client";
import { money } from "@/lib/messages";

type Db = PrismaClient | Prisma.TransactionClient;

// Keeps the auto-generated "membership surplus" Donation row (source:
// MEMBERSHIP) in sync with a Member's current status/paidAmount. Call after
// every write that touches either field. Idempotent, safe to call
// unconditionally — creates/updates/deletes as needed.
export async function syncMembershipDonation(db: Db, memberId: string) {
  const member = await db.member.findUnique({
    where: { id: memberId },
    select: {
      status: true,
      paidAmount: true,
      fullName: true,
      paymentProof: true,
      paymentMethod: true,
    },
  });
  if (!member) return;

  const surplus =
    member.status === "ACTIVE" && member.paidAmount ? member.paidAmount - MEMBERSHIP_FEE : 0;

  const existing = await db.donation.findFirst({
    where: { memberId, source: "MEMBERSHIP" },
    select: { id: true },
  });

  if (surplus > 0) {
    const data = {
      amount: surplus,
      donorName: member.fullName,
      proof: member.paymentProof,
      paymentMethod: member.paymentMethod,
    };
    if (existing) {
      await db.donation.update({ where: { id: existing.id }, data });
    } else {
      await db.donation.create({
        data: { ...data, memberId, source: "MEMBERSHIP", status: "ACTIVE" },
      });
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
  memberIds: string[];
  anonymous: boolean;
}

// Everyone who gave appears, anonymous givers included, listed as "فاعل خير"
// rather than collapsed into a footnote under the table. A member who chose to
// stay anonymous is still one row: their donations are grouped by account, so
// they are counted as one supporter without being named. A gift from someone
// with no account carries nothing to group on, so each one stands alone.
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
      // Attributed to an account, shown with that account's photo.
      const photoUrl = d.member?.photo ? `/api/files/member/${d.member.photo}` : null;
      add(`m:${d.memberId}`, { name: named, photoUrl, anonymous: false }, amount, d.memberId);
    } else if (!d.memberId && named) {
      const photoUrl = d.donorPhoto ? `/api/files/donation/${d.donorPhoto}` : null;
      add(`n:${named}`, { name: named, photoUrl, anonymous: false }, amount);
    } else if (d.memberId) {
      // Known to us, but they asked not to be named. One row per account, no
      // photo and no name, so the total is theirs without saying whose.
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
