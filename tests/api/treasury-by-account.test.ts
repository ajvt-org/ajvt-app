import { describe, it, expect, beforeEach } from "vitest";
import { GET } from "@/app/api/admin/finance/treasury/accounts/route";
import { NO_ACCOUNT } from "@/lib/accountLedger";
import { prisma } from "@/lib/prisma";
import { resetDb, get, createAdmin, signInAsAdmin } from "./helpers";

const METHOD = "بنكيلي";
const CASH = "نقداً";

async function accountOn(name: string) {
  const method = await prisma.paymentMethod.findUniqueOrThrow({ where: { name } });
  return prisma.paymentAccount.findFirstOrThrow({ where: { methodId: method.id } });
}

async function ledger(query = "") {
  const res = await GET(get(`/api/admin/finance/treasury/accounts${query}`));
  return (await res.json()).methods as {
    method: string;
    received: number;
    paid: number;
    accounts: {
      id: string;
      code: string | null;
      closed: boolean;
      received: number;
      paid: number;
    }[];
  }[];
}

async function received(amount: number, accountId: string | null, at: Date) {
  await prisma.payment.create({
    data: {
      purpose: "DONATION",
      amount,
      status: "ACTIVE",
      method: METHOD,
      accountId,
      createdAt: at,
    },
  });
}

describe("what each number received over a period", () => {
  beforeEach(async () => {
    await resetDb();
    await signInAsAdmin(await createAdmin());
  });

  it("turns away anyone who is not an admin", async () => {
    await resetDb();
    const res = await GET(get("/api/admin/finance/treasury/accounts"));
    expect(res.status).toBe(401);
  });

  it("adds up what landed in a number", async () => {
    const account = await accountOn(METHOD);
    await received(100, account.id, new Date("2026-06-15"));
    await received(50, account.id, new Date("2026-06-16"));

    const rows = await ledger();
    expect(rows[0].accounts[0].received).toBe(150);
  });

  it("counts money out against the number it left from", async () => {
    const account = await accountOn(METHOD);
    await prisma.expense.create({
      data: {
        label: "كرات",
        amount: 40,
        method: METHOD,
        accountId: account.id,
        createdBy: "admin",
        date: new Date("2026-06-15"),
      },
    });

    const rows = await ledger();
    expect(rows[0].accounts[0].paid).toBe(40);
  });

  it("keeps money nobody could place on its own line", async () => {
    await received(90, null, new Date("2026-06-15"));

    const rows = await ledger();
    const line = rows[0].accounts.find((a) => a.id === NO_ACCOUNT);
    expect(line?.received).toBe(90);
  });

  it("takes everything when no period is asked for", async () => {
    const account = await accountOn(METHOD);
    await received(10, account.id, new Date("2024-01-01"));
    await received(20, account.id, new Date("2026-06-15"));

    expect((await ledger())[0].received).toBe(30);
  });

  it("keeps what falls inside the period and drops what falls outside", async () => {
    const account = await accountOn(METHOD);
    await received(10, account.id, new Date("2026-05-31T23:00:00Z"));
    await received(20, account.id, new Date("2026-06-15"));
    await received(40, account.id, new Date("2026-07-01T02:00:00Z"));

    const rows = await ledger("?from=2026-06-01&to=2026-06-30");
    expect(rows[0].received).toBe(20);
  });

  it("keeps a payment made on the first day and on the last", async () => {
    const account = await accountOn(METHOD);
    await received(10, account.id, new Date("2026-06-01T00:00:00Z"));
    await received(20, account.id, new Date("2026-06-30T23:59:00Z"));

    const rows = await ledger("?from=2026-06-01&to=2026-06-30");
    expect(rows[0].received).toBe(30);
  });

  it("still shows a number that has since closed", async () => {
    const account = await accountOn(METHOD);
    await received(70, account.id, new Date("2026-06-15"));
    await prisma.paymentAccount.update({
      where: { id: account.id },
      data: { closedAt: new Date("2026-07-01"), active: false },
    });

    const rows = await ledger("?from=2026-06-01&to=2026-06-30");
    expect(rows[0].accounts[0].received).toBe(70);
    expect(rows[0].accounts[0].closed).toBe(true);
  });

  it("gives money paid in person a line with no number", async () => {
    await prisma.payment.create({
      data: { purpose: "DONATION", amount: 25, status: "ACTIVE", method: CASH },
    });

    const rows = await ledger();
    const cash = rows.find((row) => row.method === CASH);
    expect(cash?.accounts).toHaveLength(1);
    expect(cash?.accounts[0].id).toBe(NO_ACCOUNT);
  });

  it("leaves out a payment that is not accepted yet", async () => {
    const account = await accountOn(METHOD);
    await prisma.payment.create({
      data: {
        purpose: "DONATION",
        amount: 500,
        status: "PENDING",
        method: METHOD,
        accountId: account.id,
      },
    });

    expect(await ledger()).toEqual([]);
  });
});
