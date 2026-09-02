import { prisma } from "./prisma";
import { proofScope } from "./proofScope";
import { nameOf } from "./person";
import { DONOR_ACCOUNT_SELECT, donorNameOnRecord } from "./donorName";
import { latestByAccount } from "./currentMembership";
import { seesPaymentIdentity, seesSupporterName, type SupportViewer } from "./supportPrivacy";

const HIDDEN_ON_A_PROOF = ["memberName", "proof", "donorName", "donorPhone", "donorPhoto"];

function hideIdentity(row: object): Record<string, unknown> {
  const kept: Record<string, unknown> = { ...row };
  for (const field of HIDDEN_ON_A_PROOF) delete kept[field];
  return kept;
}

const MEMBERSHIP_SELECT = {
  userId: true,
  year: true,
  paymentProof: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  user: { select: DONOR_ACCOUNT_SELECT },
} as const;

const REGISTRATION_SELECT = {
  id: true,
  userId: true,
  paymentProof: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  user: { select: DONOR_ACCOUNT_SELECT },
  activity: { select: { title: true } },
} as const;

const DONATION_SELECT = {
  id: true,
  anonymous: true,
  donorName: true,
  donorPhone: true,
  donorPhoto: true,
  amount: true,
  proof: true,
  status: true,
  source: true,
  paymentMethod: true,
  userId: true,
  activityId: true,
  activity: { select: { title: true } },
  user: { select: DONOR_ACCOUNT_SELECT },
  tags: { select: { id: true, name: true } },
  createdAt: true,
  updatedAt: true,
} as const;

async function membershipSupport(userIds: string[]): Promise<Map<string, number>> {
  if (userIds.length === 0) return new Map();
  const payments = await prisma.payment.findMany({
    where: { purpose: "MEMBERSHIP", userId: { in: userIds } },
    select: { userId: true, year: true, amount: true, feeApplied: true },
  });
  const support = new Map<string, number>();
  for (const p of payments) {
    if (!p.userId) continue;
    const above = p.amount - Math.min(p.amount, p.feeApplied ?? 0);
    support.set(p.userId, Math.max(support.get(p.userId) ?? 0, above));
  }
  return support;
}

export async function listPaymentProofs(viewer: SupportViewer, role: string) {
  const scope = proofScope(role);

  const [memberships, registrations, donations] = await Promise.all([
    scope.membership
      ? prisma.membership.findMany({
          where: { paymentProof: { not: null } },
          select: MEMBERSHIP_SELECT,
        })
      : Promise.resolve([]),
    scope.activity
      ? prisma.activityRegistration.findMany({
          where: { paymentProof: { not: null } },
          select: REGISTRATION_SELECT,
          orderBy: { updatedAt: "desc" },
        })
      : Promise.resolve([]),
    scope.donations
      ? prisma.donation.findMany({
          where: { source: { not: "MEMBERSHIP" } },
          select: DONATION_SELECT,
          orderBy: { createdAt: "desc" },
        })
      : Promise.resolve([]),
  ]);

  const receipts = await prisma.receipt.findMany({
    where: { paymentId: { in: donations.map((d) => d.id) } },
    select: { paymentId: true, number: true, status: true, token: true },
  });
  const receiptOf = new Map(receipts.map((r) => [r.paymentId, r]));

  const current = [...latestByAccount(memberships).values()];
  const support = await membershipSupport(current.map((m) => m.userId));

  const proofs = [
    ...current.map((m) => ({
      id: m.userId,
      kind: "MEMBERSHIP" as const,
      userId: m.userId,
      proof: m.paymentProof as string,
      memberName: nameOf(m.user),
      activityTitle: null as string | null,
      amount: null as number | null,
      status: m.status,
      uploadedAt: m.updatedAt,
      submittedAt: m.createdAt,
      named: seesPaymentIdentity(viewer, {
        userId: m.userId,
        user: m.user,
        purpose: "MEMBERSHIP",
        amount: support.get(m.userId) ?? 0,
      }),
    })),
    ...registrations.map((r) => ({
      id: r.id,
      kind: "ACTIVITY" as const,
      userId: r.userId,
      proof: r.paymentProof as string,
      memberName: nameOf(r.user),
      activityTitle: r.activity.title,
      amount: null as number | null,
      status: r.status,
      uploadedAt: r.updatedAt,
      submittedAt: r.createdAt,
      named: true,
    })),
    ...donations.map((d) => ({
      id: d.id,
      kind: "DONATION" as const,
      proof: d.proof as string | null,
      memberName: donorNameOnRecord(d, viewer),
      activityId: d.activityId,
      activityTitle: d.activity?.title ?? null,
      amount: d.amount,
      status: d.status,
      source: d.source,
      paymentMethod: d.paymentMethod,
      userId: d.userId,
      anonymous: d.anonymous,
      donorName: d.donorName,
      donorPhone: d.donorPhone,
      donorPhoto: d.donorPhoto,
      tags: d.tags,
      receipt: receiptOf.get(d.id) ?? null,
      uploadedAt: d.updatedAt,
      submittedAt: d.createdAt,
      named: seesSupporterName(viewer, d),
    })),
  ];

  return proofs
    .sort((a, b) => b.uploadedAt.getTime() - a.uploadedAt.getTime())
    .map(({ named, ...row }) => (named ? row : hideIdentity(row)));
}
