import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { attachPlanned } from "@/lib/backfillAccountsServer";
import type { AttachPlan } from "@/lib/backfillAccounts";
import { resetDb } from "./helpers";

const METHOD = "بنكيلي";

async function anAccount(code: string) {
  const method = await prisma.paymentMethod.findFirstOrThrow({ where: { name: METHOD } });
  return prisma.paymentAccount.create({ data: { methodId: method.id, code, position: 1 } });
}

async function aPayment(accountId: string | null = null) {
  return prisma.payment.create({
    data: { purpose: "DONATION", amount: 100, method: METHOD, accountId },
  });
}

async function anExpense() {
  return prisma.expense.create({
    data: { label: "كرات", amount: 100, method: METHOD, createdBy: "admin" },
  });
}

describe("attaching a backfill plan", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("attaches every table in the plan", async () => {
    const account = await anAccount("444444");
    const payment = await aPayment();
    const expense = await anExpense();

    await attachPlanned(prisma, [
      { table: "Payment", accountId: account.id, ids: [payment.id] },
      { table: "Expense", accountId: account.id, ids: [expense.id] },
    ]);

    expect((await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } })).accountId).toBe(
      account.id,
    );
    expect((await prisma.expense.findUniqueOrThrow({ where: { id: expense.id } })).accountId).toBe(
      account.id,
    );
  });

  it("attaches nothing at all when a later table fails", async () => {
    const account = await anAccount("444444");
    const payment = await aPayment();
    const expense = await anExpense();

    const plan: AttachPlan[] = [
      { table: "Payment", accountId: account.id, ids: [payment.id] },
      { table: "Expense", accountId: "not-an-account", ids: [expense.id] },
    ];

    await expect(attachPlanned(prisma, plan)).rejects.toThrow();

    expect(
      (await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } })).accountId,
    ).toBeNull();
    expect(
      (await prisma.expense.findUniqueOrThrow({ where: { id: expense.id } })).accountId,
    ).toBeNull();
  });

  it("leaves a row that already carries a number alone", async () => {
    const account = await anAccount("444444");
    const other = await anAccount("555555");
    const payment = await aPayment(other.id);

    await attachPlanned(prisma, [{ table: "Payment", accountId: account.id, ids: [payment.id] }]);

    expect((await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } })).accountId).toBe(
      other.id,
    );
  });
});
