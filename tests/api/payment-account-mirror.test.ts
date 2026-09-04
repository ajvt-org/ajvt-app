import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { runningYear } from "@/lib/membershipYear";
import { MEMBERSHIP_FEE } from "@/lib/donations";
import { recordMembershipPayment } from "@/lib/membershipPaymentServer";
import { donationMirrorOf, mirrorDonation } from "@/lib/paymentMirror";
import { resetDb, createUser } from "./helpers";

const YEAR = runningYear();

async function anAccount() {
  return prisma.paymentAccount.findFirstOrThrow();
}

describe("the account a money row carries", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("reaches the payment a membership is mirrored into", async () => {
    const account = await anAccount();
    const user = await createUser();
    await prisma.membership.create({
      data: {
        userId: user.id,
        year: YEAR,
        status: "ACTIVE",
        paymentMethod: "بنكيلي",
        accountId: account.id,
      },
    });

    await recordMembershipPayment(prisma, user.id, MEMBERSHIP_FEE, MEMBERSHIP_FEE);

    const payment = await prisma.payment.findFirstOrThrow({
      where: { userId: user.id, year: YEAR, purpose: "MEMBERSHIP" },
    });
    expect(payment.accountId).toBe(account.id);
  });

  it("reaches the payment a donation is mirrored into", async () => {
    const account = await anAccount();
    const donation = await prisma.donation.create({
      data: { amount: 5000, status: "ACTIVE", paymentMethod: "بنكيلي", accountId: account.id },
    });

    await mirrorDonation(prisma, donationMirrorOf(donation));

    const payment = await prisma.payment.findUniqueOrThrow({ where: { id: donation.id } });
    expect(payment.accountId).toBe(account.id);
  });

  it("updates the payment when the account on a donation changes", async () => {
    const account = await anAccount();
    const donation = await prisma.donation.create({
      data: { amount: 5000, status: "ACTIVE", paymentMethod: "بنكيلي", accountId: account.id },
    });
    await mirrorDonation(prisma, donationMirrorOf(donation));

    const moved = await prisma.donation.update({
      where: { id: donation.id },
      data: { accountId: null },
    });
    await mirrorDonation(prisma, donationMirrorOf(moved));

    const payment = await prisma.payment.findUniqueOrThrow({ where: { id: donation.id } });
    expect(payment.accountId).toBeNull();
  });

  it("leaves the payment without one when the membership has none", async () => {
    const user = await createUser("22334466");
    await prisma.membership.create({
      data: { userId: user.id, year: YEAR, status: "ACTIVE", paymentMethod: "نقداً" },
    });

    await recordMembershipPayment(prisma, user.id, MEMBERSHIP_FEE, MEMBERSHIP_FEE);

    const payment = await prisma.payment.findFirstOrThrow({
      where: { userId: user.id, year: YEAR, purpose: "MEMBERSHIP" },
    });
    expect(payment.accountId).toBeNull();
  });
});
