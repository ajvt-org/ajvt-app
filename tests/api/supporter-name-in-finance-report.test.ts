import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { OWNER_ROLE, SUPER_ROLE } from "@/lib/adminRoles";
import { MEMBERSHIP_FEE } from "@/lib/donations";
import { getFinanceSummary } from "@/lib/financeServer";
import { resetDb, createUser, makeMember } from "./helpers";

const GIVER = "الكريم ولد الساتر";
const ADMIN = { role: SUPER_ROLE };
const OWNER = { role: OWNER_ROLE };

async function marked() {
  const user = await createUser("44001122");
  return prisma.user.update({
    where: { id: user.id },
    data: { fullName: GIVER, supportNameConfidential: true },
  });
}

async function supportOf(userId: string, amount: number) {
  return prisma.payment.create({
    data: {
      purpose: "DONATION",
      amount,
      method: "بنكيلي",
      status: "ACTIVE",
      userId,
      donorName: GIVER,
    },
  });
}

const namesIn = (summary: unknown) => JSON.stringify(summary);

describe("a confidential supporter in the finance report", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("is unnamed in the day records and the method detail", async () => {
    const giver = await marked();
    await supportOf(giver.id, 5000);

    expect(namesIn(await getFinanceSummary(ADMIN))).not.toContain(GIVER);
  });

  it("is named for the role that holds the promise", async () => {
    const giver = await marked();
    await supportOf(giver.id, 5000);

    expect(namesIn(await getFinanceSummary(OWNER))).toContain(GIVER);
  });

  it("counts the same money either way", async () => {
    const giver = await marked();
    await supportOf(giver.id, 5000);

    const hidden = await getFinanceSummary(ADMIN);
    const shown = await getFinanceSummary(OWNER);

    expect(hidden.totalRevenue).toBe(5000);
    expect(shown.totalRevenue).toBe(5000);
    expect(hidden.byMethod).toEqual(shown.byMethod);
  });

  it("keeps the method detail adding up to the same amount", async () => {
    const giver = await marked();
    await supportOf(giver.id, 5000);

    const detail = (await getFinanceSummary(ADMIN)).byMethodDetail["بنكيلي"];
    const named = detail.daem.reduce((sum, row) => sum + row.amount, 0);

    expect(named + detail.anonymousTotal).toBe(5000);
  });

  it("hides the membership leg too when a membership payment carries a surplus", async () => {
    const giver = await marked();
    await makeMember({
      userId: giver.id,
      status: "ACTIVE",
      paymentMethod: "بنكيلي",
      paidAmount: MEMBERSHIP_FEE + 4900,
    });

    const summary = await getFinanceSummary(ADMIN);

    expect(namesIn(summary)).not.toContain(GIVER);
    expect(summary.totalRevenue).toBe(MEMBERSHIP_FEE + 4900);
  });

  it("names him on a membership payment that stops at the fee", async () => {
    const giver = await marked();
    await makeMember({
      userId: giver.id,
      status: "ACTIVE",
      paymentMethod: "بنكيلي",
      paidAmount: MEMBERSHIP_FEE,
    });

    expect(namesIn(await getFinanceSummary(ADMIN))).toContain(GIVER);
  });

  it("leaves a giver who is not marked exactly as they were", async () => {
    const plain = await createUser("44003344");
    await prisma.user.update({ where: { id: plain.id }, data: { fullName: "عادي ولد عادي" } });
    await prisma.payment.create({
      data: {
        purpose: "DONATION",
        amount: 3000,
        method: "بنكيلي",
        status: "ACTIVE",
        userId: plain.id,
        donorName: "عادي ولد عادي",
      },
    });

    expect(namesIn(await getFinanceSummary(ADMIN))).toContain("عادي ولد عادي");
  });

  it("keeps an unnamed giver unnamed and still counted", async () => {
    const plain = await createUser("44005566");
    await prisma.user.update({ where: { id: plain.id }, data: { fullName: "مجهول ولد مجهول" } });
    await prisma.payment.create({
      data: {
        purpose: "DONATION",
        amount: 700,
        method: "بنكيلي",
        status: "ACTIVE",
        userId: plain.id,
        anonymous: true,
      },
    });

    const summary = await getFinanceSummary(ADMIN);

    expect(namesIn(summary)).not.toContain("مجهول ولد مجهول");
    expect(summary.totalRevenue).toBe(700);
  });
});
