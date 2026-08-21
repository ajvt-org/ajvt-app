import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { resetDb, get, createAdmin, signInAsAdmin } from "./helpers";

import { GET as REPORT } from "@/app/api/admin/finance/report/route";

const read = (from: string, to: string) =>
  REPORT(get(`/api/admin/finance/report?from=${from}&to=${to}`));

async function income(amount: number, at: string, tags: string[] = [], purpose = "DONATION") {
  return prisma.payment.create({
    data: {
      purpose: purpose as "DONATION" | "MEMBERSHIP",
      amount,
      feeApplied: purpose === "MEMBERSHIP" ? 1000 : null,
      status: "ACTIVE",
      createdAt: new Date(at),
      tags: { connectOrCreate: tags.map((name) => ({ where: { name }, create: { name } })) },
    },
  });
}

async function spending(amount: number, at: string, tags: string[] = []) {
  return prisma.expense.create({
    data: {
      label: "مصروف",
      amount,
      date: new Date(at),
      createdBy: "boss",
      tags: { connectOrCreate: tags.map((name) => ({ where: { name }, create: { name } })) },
    },
  });
}

describe("the finance report over a chosen period", () => {
  beforeEach(async () => {
    await resetDb();
    await signInAsAdmin(await createAdmin("boss", "SUPER"));
  });

  it("counts only what falls inside the period", async () => {
    await income(500, "2026-02-10T10:00:00Z");
    await income(900, "2026-05-10T10:00:00Z");

    const body = await (await read("2026-01-01", "2026-03-31")).json();

    expect(body.totals.income).toBe(500);
  });

  it("breaks the period down month by month", async () => {
    await income(500, "2026-01-10T10:00:00Z");
    await spending(200, "2026-02-10T10:00:00Z");

    const body = await (await read("2026-01-01", "2026-02-28")).json();

    expect(body.months).toEqual([
      { month: "2026-01", income: 500, spending: 0, net: 500 },
      { month: "2026-02", income: 0, spending: 200, net: -200 },
    ]);
  });

  it("splits spending by tag", async () => {
    await spending(300, "2026-01-10T10:00:00Z", ["كرة"]);
    await spending(700, "2026-01-11T10:00:00Z", ["سفر"]);

    const body = await (await read("2026-01-01", "2026-01-31")).json();

    expect(body.spendingByTag).toEqual([
      { tag: "سفر", amount: 700 },
      { tag: "كرة", amount: 300 },
    ]);
  });

  it("keeps the fee apart from the support in a membership payment", async () => {
    await income(2500, "2026-01-10T10:00:00Z", [], "MEMBERSHIP");

    const body = await (await read("2026-01-01", "2026-01-31")).json();

    expect(body.totals.membershipFees).toBe(1000);
    expect(body.totals.support).toBe(1500);
  });

  it("leaves a payment still awaiting review out", async () => {
    await prisma.payment.create({
      data: {
        purpose: "DONATION",
        amount: 900,
        status: "PENDING",
        createdAt: new Date("2026-01-10T10:00:00Z"),
      },
    });

    const body = await (await read("2026-01-01", "2026-01-31")).json();

    expect(body.totals.income).toBe(0);
  });

  it("takes the last day of the period whole rather than to midnight", async () => {
    await income(400, "2026-01-31T22:30:00Z");

    const body = await (await read("2026-01-01", "2026-01-31")).json();

    expect(body.totals.income).toBe(400);
  });

  it("refuses a period that runs backwards", async () => {
    expect((await read("2026-05-01", "2026-01-01")).status).toBe(400);
  });

  it("refuses a date that is not a date", async () => {
    expect((await read("hier", "2026-01-01")).status).toBe(400);
  });

  it("answers an empty period with zeroes rather than failing", async () => {
    const body = await (await read("2026-01-01", "2026-01-31")).json();

    expect(body.totals).toEqual({
      income: 0,
      spending: 0,
      net: 0,
      membershipFees: 0,
      support: 0,
    });
  });

  it("is closed to someone who is not signed in", async () => {
    const { clearCookies } = await import("./cookieJar");
    clearCookies();

    expect((await read("2026-01-01", "2026-01-31")).status).toBe(401);
  });
});
