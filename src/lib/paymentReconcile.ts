import { prisma } from "./prisma";
import { splitPayment } from "./membershipPayment";

export interface Reconciliation {
  agrees: boolean;
  membershipFees: { old: number; new: number };
  membershipSupport: { old: number; new: number };
  otherDonations: { old: number; new: number };
}

function equal(a: number, b: number) {
  return a === b;
}

export async function reconcilePayments(): Promise<Reconciliation> {
  const [members, surplus, others, payments] = await Promise.all([
    prisma.membership.findMany({ select: { paidAmount: true } }),
    prisma.donation.findMany({
      where: { source: "MEMBERSHIP" },
      select: { amount: true },
    }),
    prisma.donation.findMany({
      where: { source: { not: "MEMBERSHIP" }, amount: { not: null } },
      select: { amount: true },
    }),
    prisma.payment.findMany({
      select: { purpose: true, amount: true, feeApplied: true },
    }),
  ]);

  const sum = (rows: { amount: number | null }[]) => rows.reduce((t, r) => t + (r.amount ?? 0), 0);

  const membershipPayments = payments.filter((p) => p.purpose === "MEMBERSHIP");
  const newFees = membershipPayments.reduce(
    (t, p) => t + splitPayment(p.amount, p.feeApplied ?? 0).fee,
    0,
  );
  const newSupport = membershipPayments.reduce(
    (t, p) => t + splitPayment(p.amount, p.feeApplied ?? 0).surplus,
    0,
  );
  const newOthers = payments
    .filter((p) => p.purpose !== "MEMBERSHIP")
    .reduce((t, p) => t + p.amount, 0);

  const result: Reconciliation = {
    agrees: false,
    membershipFees: {
      old: members.reduce((t, r) => t + (r.paidAmount ?? 0), 0),
      new: newFees,
    },
    membershipSupport: { old: sum(surplus), new: newSupport },
    otherDonations: { old: sum(others), new: newOthers },
  };
  result.agrees =
    equal(result.membershipFees.old, result.membershipFees.new) &&
    equal(result.membershipSupport.old, result.membershipSupport.new) &&
    equal(result.otherDonations.old, result.otherDonations.new);
  return result;
}
