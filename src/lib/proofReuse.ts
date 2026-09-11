import { prisma } from "@/lib/prisma";
import { nameOf } from "./person";
import { DONOR_ACCOUNT_SELECT, donorNameOnRecord } from "./donorName";
import { seesSupporterName, type SupportViewer } from "./supportPrivacy";
import { proofReuseHref, uniqueExpenses, type ProofReuseKind } from "./proofReuseRows";

export type ProofReuse = {
  kind: ProofReuseKind;
  id: string;
  label: string;
  date: Date;
  amount: number | null;
  state: string | null;
  href: string;
};

const PAYMENT_SELECT = {
  id: true,
  purpose: true,
  userId: true,
  year: true,
  donorName: true,
  amount: true,
  status: true,
  createdAt: true,
  user: { select: DONOR_ACCOUNT_SELECT },
} as const;

type MembershipPayment = {
  userId: string;
  year: number | null;
  amount: number;
  status: string;
  createdAt: Date;
  user: { fullName: string | null; supportNameConfidential: boolean } | null;
};

function yearKey(userId: string, year: number | null): string {
  return `${userId}:${year ?? ""}`;
}

async function submittedAtOf(rows: MembershipPayment[]): Promise<Map<string, Date>> {
  if (rows.length === 0) return new Map();
  const memberships = await prisma.membership.findMany({
    where: { userId: { in: rows.map((row) => row.userId) } },
    select: { userId: true, year: true, createdAt: true },
  });
  return new Map(memberships.map((m) => [yearKey(m.userId, m.year), m.createdAt]));
}

export async function findProofReuse(
  filename: string | null | undefined,
  viewer: SupportViewer,
  ignore?: { kind: ProofReuse["kind"]; id: string },
): Promise<ProofReuse[]> {
  if (!filename) return [];

  const mine = await prisma.proofImage.findUnique({ where: { filename } });
  if (!mine) return [];

  return proofReuseOf(mine.sha256, viewer, { besides: filename, ignore });
}

export async function proofReuseOf(
  sha256: string,
  viewer: SupportViewer,
  options?: { besides?: string; ignore?: { kind: ProofReuse["kind"]; id: string } },
): Promise<ProofReuse[]> {
  if (!sha256) return [];
  const besides = options?.besides;
  const ignore = options?.ignore;

  const sameImage = await prisma.proofImage.findMany({
    where: { sha256, ...(besides ? { filename: { not: besides } } : {}) },
    select: { filename: true },
  });
  if (sameImage.length === 0) return [];

  const names = sameImage.map((row) => row.filename);
  const [payments, expenseProofs, legacyExpenses] = await Promise.all([
    prisma.payment.findMany({ where: { proof: { in: names } }, select: PAYMENT_SELECT }),
    prisma.expenseProof.findMany({
      where: { filename: { in: names } },
      select: { expense: { select: { id: true, label: true, date: true, amount: true } } },
    }),
    prisma.expense.findMany({
      where: { proof: { in: names } },
      select: { id: true, label: true, date: true, amount: true },
    }),
  ]);

  const members = payments.filter(
    (p): p is (typeof payments)[number] & MembershipPayment =>
      p.purpose === "MEMBERSHIP" && p.userId !== null,
  );
  const given = payments.filter((p) => p.purpose !== "MEMBERSHIP");
  const submittedAt = await submittedAtOf(members);

  const found: ProofReuse[] = [
    ...members.map((m) => ({
      kind: "member" as const,
      id: m.userId,
      label: seesSupporterName(viewer, m) && m.user ? nameOf(m.user) : "",
      date: submittedAt.get(yearKey(m.userId, m.year)) ?? m.createdAt,
      amount: m.amount,
      state: m.status,
      href: proofReuseHref("member", m.userId, ""),
    })),
    ...given.map((d) => ({
      kind: "donation" as const,
      id: d.id,
      label: donorNameOnRecord(d, viewer),
      date: d.createdAt,
      amount: d.amount,
      state: d.status,
      href: proofReuseHref("donation", d.id, ""),
    })),
    ...uniqueExpenses([...expenseProofs.map((row) => row.expense), ...legacyExpenses]).map((e) => ({
      kind: "expense" as const,
      id: e.id,
      label: e.label,
      date: e.date,
      amount: e.amount,
      state: null,
      href: proofReuseHref("expense", e.id, e.label),
    })),
  ];

  return found
    .filter((row) => !(ignore && row.kind === ignore.kind && row.id === ignore.id))
    .sort((a, b) => a.date.getTime() - b.date.getTime());
}
