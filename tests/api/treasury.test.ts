import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { resetDb, createAdmin, signInAsAdmin } from "./helpers";
import { GET as TREASURY } from "@/app/api/admin/finance/treasury/route";

async function payment(over: Record<string, unknown> = {}) {
  return prisma.payment.create({
    data: {
      purpose: "DONATION",
      amount: 1000,
      status: "ACTIVE",
      method: "بنكيلي",
      ...over,
    },
  });
}

async function expense(amount: number) {
  return prisma.expense.create({
    data: { label: "كرات", amount, createdBy: "admin" },
  });
}

describe("the treasury screen", () => {
  beforeEach(async () => {
    await resetDb();
    await signInAsAdmin(await createAdmin());
  });

  it("reports nothing on an empty association", async () => {
    const body = await (await TREASURY()).json();

    expect(body).toMatchObject({ balance: 0, income: 0, spending: 0 });
  });

  it("takes the spending off the income", async () => {
    await payment({ amount: 5000 });
    await expense(1200);

    const body = await (await TREASURY()).json();

    expect(body).toMatchObject({ income: 5000, spending: 1200, balance: 3800 });
  });

  it("leaves a payment still under review out of the balance", async () => {
    await payment({ amount: 5000, status: "PENDING" });

    expect((await (await TREASURY()).json()).balance).toBe(0);
  });

  it("splits a membership payment into the fee and the surplus", async () => {
    await payment({ purpose: "MEMBERSHIP", amount: 1500, feeApplied: 1000 });

    const body = await (await TREASURY()).json();

    expect(body).toMatchObject({ fees: 1000, support: 500 });
  });

  it("groups the income by payment method", async () => {
    await payment({ amount: 700, method: "نقداً" });
    await payment({ amount: 300, method: "نقداً" });

    const body = await (await TREASURY()).json();

    expect(body.byMethod).toContainEqual({ method: "نقداً", amount: 1000 });
  });

  it("is closed to an admin without the finance section", async () => {
    await signInAsAdmin(await createAdmin("activities", "ACTIVITY"));

    expect((await TREASURY()).status).toBe(403);
  });
});
