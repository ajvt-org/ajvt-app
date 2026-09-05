import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { INITIAL_PAYMENT_ACCOUNTS } from "@/lib/paymentMethods";
import { resetDb } from "./helpers";

const WITH_A_CODE = INITIAL_PAYMENT_ACCOUNTS[0].method;
const CASH = "نقداً";

describe("an account under a payment method", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("loads with the method that holds it", async () => {
    const method = await prisma.paymentMethod.findUnique({
      where: { name: WITH_A_CODE },
      include: { accounts: true },
    });
    expect(method?.accounts).toHaveLength(1);
    expect(method?.accounts[0].closedAt).toBeNull();
    expect(method?.accounts[0].active).toBe(true);
  });

  it("leaves a method that has no code without one", async () => {
    const method = await prisma.paymentMethod.findUnique({
      where: { name: CASH },
      include: { accounts: true },
    });
    expect(method?.accounts).toEqual([]);
  });

  it("refuses a second account with the same code under one method", async () => {
    const method = await prisma.paymentMethod.findUniqueOrThrow({ where: { name: WITH_A_CODE } });
    const existing = await prisma.paymentAccount.findFirstOrThrow({
      where: { methodId: method.id },
    });
    await expect(
      prisma.paymentAccount.create({
        data: { methodId: method.id, code: existing.code, position: 2 },
      }),
    ).rejects.toThrow();
  });

  it("takes the same code under a different method", async () => {
    const method = await prisma.paymentMethod.findUniqueOrThrow({ where: { name: WITH_A_CODE } });
    const existing = await prisma.paymentAccount.findFirstOrThrow({
      where: { methodId: method.id },
    });
    const cash = await prisma.paymentMethod.findUniqueOrThrow({ where: { name: CASH } });
    const created = await prisma.paymentAccount.create({
      data: { methodId: cash.id, code: existing.code, position: 1 },
    });
    expect(created.methodId).toBe(cash.id);
  });

  it("refuses to delete the method it belongs to", async () => {
    const method = await prisma.paymentMethod.findUniqueOrThrow({ where: { name: WITH_A_CODE } });
    await expect(prisma.paymentMethod.delete({ where: { id: method.id } })).rejects.toThrow();
    expect(await prisma.paymentMethod.findUnique({ where: { id: method.id } })).not.toBeNull();
  });

  it("refuses to delete an account a payment points at", async () => {
    const account = await prisma.paymentAccount.findFirstOrThrow();
    await prisma.payment.create({
      data: { purpose: "DONATION", amount: 1000, accountId: account.id },
    });
    await expect(prisma.paymentAccount.delete({ where: { id: account.id } })).rejects.toThrow();
  });

  it("refuses to delete an account an expense points at", async () => {
    const account = await prisma.paymentAccount.findFirstOrThrow();
    await prisma.expense.create({
      data: { label: "إيجار الملعب", amount: 12000, createdBy: "admin", accountId: account.id },
    });
    await expect(prisma.paymentAccount.delete({ where: { id: account.id } })).rejects.toThrow();
  });

  it("lets a method with no account be deleted", async () => {
    const cash = await prisma.paymentMethod.findUniqueOrThrow({ where: { name: CASH } });
    await prisma.paymentMethod.delete({ where: { id: cash.id } });
    expect(await prisma.paymentMethod.findUnique({ where: { id: cash.id } })).toBeNull();
  });
});
