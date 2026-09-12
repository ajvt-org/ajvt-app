import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { runningYear } from "@/lib/membershipYear";
import { MEMBERSHIP_FEE } from "@/lib/donations";
import { resetDb, makeMember } from "./helpers";

const YEAR = runningYear();

const membershipPayment = (userId: string, year: number) => ({
  purpose: "MEMBERSHIP" as const,
  userId,
  year,
  amount: MEMBERSHIP_FEE,
  feeApplied: MEMBERSHIP_FEE,
  status: "ACTIVE" as const,
});

async function member() {
  return makeMember({
    fullName: "محمد ولد أحمد",
    age: "البدريين",
    paymentMethod: "بنكيلي",
    status: "ACTIVE",
    membershipYear: YEAR,
  });
}

describe("how many membership payments one member can hold for a year", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("takes the first one", async () => {
    const { userId } = await member();

    await prisma.payment.create({ data: membershipPayment(userId, YEAR) });

    expect(await prisma.payment.count({ where: { userId, purpose: "MEMBERSHIP" } })).toBe(1);
  });

  it("refuses a second one for the same year", async () => {
    const { userId } = await member();
    await prisma.payment.create({ data: membershipPayment(userId, YEAR) });

    await expect(
      prisma.payment.create({ data: membershipPayment(userId, YEAR) }),
    ).rejects.toThrow();

    expect(await prisma.payment.count({ where: { userId, purpose: "MEMBERSHIP" } })).toBe(1);
  });

  it("takes another year for the same member", async () => {
    const { userId } = await member();
    await prisma.payment.create({ data: membershipPayment(userId, YEAR) });

    await prisma.payment.create({ data: membershipPayment(userId, YEAR - 1) });

    expect(await prisma.payment.count({ where: { userId, purpose: "MEMBERSHIP" } })).toBe(2);
  });

  it("leaves donations alone, which carry no year", async () => {
    const { userId } = await member();
    const donation = { purpose: "DONATION" as const, userId, amount: 100 };

    await prisma.payment.create({ data: donation });
    await prisma.payment.create({ data: donation });

    expect(await prisma.payment.count({ where: { userId, purpose: "DONATION" } })).toBe(2);
  });

  it("leaves activity payments alone, which carry no year either", async () => {
    const { userId } = await member();
    const activity = { purpose: "ACTIVITY" as const, userId, amount: 100 };

    await prisma.payment.create({ data: activity });
    await prisma.payment.create({ data: activity });

    expect(await prisma.payment.count({ where: { userId, purpose: "ACTIVITY" } })).toBe(2);
  });
});
