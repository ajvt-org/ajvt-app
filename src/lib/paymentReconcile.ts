import { prisma } from "./prisma";

export interface Mismatch {
  memberId: string | null;
  year: number | null;
  kind: "MEMBERSHIP" | "DONATION";
  old: number;
  now: number;
}

export interface Reconciliation {
  agrees: boolean;
  mismatches: Mismatch[];
}

type Totals = Map<string, number>;

function add(map: Totals, key: string, amount: number) {
  map.set(key, (map.get(key) ?? 0) + amount);
}

export async function reconcilePayments(): Promise<Reconciliation> {
  const [members, memberships, surplus, others, payments] = await Promise.all([
    prisma.member.findMany({ select: { id: true, membershipYear: true, paidAmount: true } }),
    prisma.membership.findMany({ select: { memberId: true, year: true, paidAmount: true } }),
    prisma.donation.findMany({
      where: { source: "MEMBERSHIP" },
      select: { memberId: true, membershipYear: true, amount: true },
    }),
    prisma.donation.findMany({
      where: { source: { not: "MEMBERSHIP" }, amount: { not: null } },
      select: { id: true, amount: true },
    }),
    prisma.payment.findMany({
      select: { id: true, purpose: true, memberId: true, year: true, amount: true },
    }),
  ]);

  const old: Totals = new Map();
  const byMember = new Map(members.map((m) => [m.id, m]));

  for (const m of members) {
    if (m.paidAmount) add(old, `m:${m.id}:${m.membershipYear}`, m.paidAmount);
  }
  for (const ms of memberships) {
    const member = byMember.get(ms.memberId);
    if (member && member.membershipYear === ms.year) continue;
    if (ms.paidAmount) add(old, `m:${ms.memberId}:${ms.year}`, ms.paidAmount);
  }
  for (const d of surplus) {
    if (d.amount && d.memberId) add(old, `m:${d.memberId}:${d.membershipYear}`, d.amount);
  }
  for (const d of others) add(old, `d:${d.id}`, d.amount ?? 0);

  const now: Totals = new Map();
  for (const p of payments) {
    if (p.purpose === "MEMBERSHIP") add(now, `m:${p.memberId}:${p.year}`, p.amount);
    else add(now, `d:${p.id}`, p.amount);
  }

  const mismatches: Mismatch[] = [];
  for (const key of new Set([...old.keys(), ...now.keys()])) {
    const a = old.get(key) ?? 0;
    const b = now.get(key) ?? 0;
    if (a === b) continue;
    const [kind, first, second] = key.split(":");
    mismatches.push({
      kind: kind === "m" ? "MEMBERSHIP" : "DONATION",
      memberId: kind === "m" ? first : null,
      year: kind === "m" ? Number(second) : null,
      old: a,
      now: b,
    });
  }

  return { agrees: mismatches.length === 0, mismatches };
}
