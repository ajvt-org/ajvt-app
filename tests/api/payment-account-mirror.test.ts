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

  it("reaches the payment a membership fee is written to", async () => {
    const account = await anAccount();
    const user = await createUser();
    await prisma.membership.create({
      data: { userId: user.id, year: YEAR, status: "ACTIVE" },
    });

    await recordMembershipPayment(prisma, user.id, MEMBERSHIP_FEE, MEMBERSHIP_FEE, {
      method: "بنكيلي",
      accountId: account.id,
      status: "ACTIVE",
    });

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

  it("leaves the payment without one when the fee names none", async () => {
    const user = await createUser("22334466");
    await prisma.membership.create({
      data: { userId: user.id, year: YEAR, status: "ACTIVE" },
    });

    await recordMembershipPayment(prisma, user.id, MEMBERSHIP_FEE, MEMBERSHIP_FEE, {
      method: "نقداً",
      status: "ACTIVE",
    });

    const payment = await prisma.payment.findFirstOrThrow({
      where: { userId: user.id, year: YEAR, purpose: "MEMBERSHIP" },
    });
    expect(payment.accountId).toBeNull();
  });
});

describe("the bank's own reference on a money row", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("reaches the payment a membership fee is written to", async () => {
    const user = await createUser("22551100");
    await prisma.membership.create({
      data: { userId: user.id, year: YEAR, status: "ACTIVE" },
    });

    await recordMembershipPayment(prisma, user.id, MEMBERSHIP_FEE, MEMBERSHIP_FEE, {
      method: "بنكيلي",
      bankReference: "7026081422303210001",
      status: "ACTIVE",
    });

    const payment = await prisma.payment.findFirstOrThrow({
      where: { userId: user.id, purpose: "MEMBERSHIP" },
    });
    expect(payment.bankReference).toBe("7026081422303210001");
  });

  it("reaches the payment a donation is mirrored into", async () => {
    const donation = await prisma.donation.create({
      data: {
        amount: 5000,
        status: "ACTIVE",
        paymentMethod: "بنكيلي",
        bankReference: "TR10000000001",
      },
    });

    await mirrorDonation(prisma, donationMirrorOf(donation));

    const payment = await prisma.payment.findUniqueOrThrow({ where: { id: donation.id } });
    expect(payment.bankReference).toBe("TR10000000001");
  });

  it("is not the order code the app generates, which the payment keeps apart", async () => {
    const user = await createUser("22551122");
    await prisma.membership.create({
      data: { userId: user.id, year: YEAR, status: "ACTIVE" },
    });

    await recordMembershipPayment(prisma, user.id, MEMBERSHIP_FEE, MEMBERSHIP_FEE, {
      method: "بنكيلي",
      referenceCode: "AJV-TEST1",
      bankReference: "TR10000000002",
      status: "ACTIVE",
    });

    const payment = await prisma.payment.findFirstOrThrow({ where: { userId: user.id } });
    expect(payment.referenceCode).toBe("AJV-TEST1");
    expect(payment.bankReference).toBe("TR10000000002");
  });

  it("stays empty when nobody typed one", async () => {
    const user = await createUser("22551133");
    await prisma.membership.create({
      data: { userId: user.id, year: YEAR, status: "ACTIVE" },
    });

    await recordMembershipPayment(prisma, user.id, MEMBERSHIP_FEE, MEMBERSHIP_FEE, {
      method: "بنكيلي",
      status: "ACTIVE",
    });

    const payment = await prisma.payment.findFirstOrThrow({
      where: { userId: user.id, purpose: "MEMBERSHIP" },
    });
    expect(payment.bankReference).toBeNull();
  });
});
