import { describe, it, expect, beforeEach } from "vitest";
import { POST as CREATE_EXPENSE } from "@/app/api/admin/expenses/route";
import { PATCH as UPDATE_EXPENSE } from "@/app/api/admin/expenses/[id]/route";
import { GET as ACTIVITY_FINANCE } from "@/app/api/admin/activities/[id]/finance/route";
import { prisma } from "@/lib/prisma";
import { activityFinanceReport } from "@/lib/activityReportServer";
import { resetDb, get, post, patch, createAdmin, signInAsAdmin, withId } from "./helpers";

const FROM = new Date(Date.UTC(2020, 0, 1));
const TO = new Date(Date.UTC(2030, 0, 1));

async function activity(id: string, title: string) {
  return prisma.activity.create({ data: { id, title, description: "وصف" } });
}

async function record(body: Record<string, unknown>) {
  const res = await CREATE_EXPENSE(
    post("/api/admin/expenses", { label: "شراء", amount: 100, ...body }),
  );
  return (await res.json()).expense as { id: string };
}

async function splitAcross(amount: number, shares: { activityId: string; amount: number }[]) {
  return prisma.expense.create({
    data: {
      label: "فاتورة واحدة",
      amount,
      createdBy: "admin",
      allocations: { create: shares },
    },
  });
}

async function spendingByKey() {
  const report = await activityFinanceReport(FROM, TO);
  return Object.fromEntries(report.rows.map((row) => [row.key, row.spending]));
}

async function ledgerFor(id: string) {
  const res = await ACTIVITY_FINANCE(get(`/api/admin/activities/${id}/finance`), withId(id));
  return (await res.json()) as {
    rows: { id: string; kind: string; label: string; amount: number }[];
    totals: { expenses: number; income: number; balance: number };
  };
}

describe("the finance readers when every expense has one destination", () => {
  beforeEach(async () => {
    await resetDb();
    await signInAsAdmin(await createAdmin());
  });

  it("puts an expense on the activity it was recorded against", async () => {
    await activity("a1", "نشاط");

    await record({ amount: 700, activityId: "a1" });

    expect((await spendingByKey())["a1"]).toBe(700);
    expect((await ledgerFor("a1")).totals.expenses).toBe(700);
  });

  it("leaves an expense with no destination in the general row", async () => {
    await activity("a1", "نشاط");

    await record({ amount: 500 });

    const spending = await spendingByKey();
    expect(spending["general"]).toBe(500);
    expect(spending["a1"] ?? 0).toBe(0);
  });

  it("moves the spending when the destination is corrected", async () => {
    await activity("a1", "نشاط");
    await activity("a2", "نشاط آخر");
    const expense = await record({ amount: 900, activityId: "a1" });

    await UPDATE_EXPENSE(
      patch(`/api/admin/expenses/${expense.id}`, { activityId: "a2" }),
      withId(expense.id),
    );

    const spending = await spendingByKey();
    expect(spending["a1"] ?? 0).toBe(0);
    expect(spending["a2"]).toBe(900);
  });
});

describe("the finance readers when one expense covers several destinations", () => {
  beforeEach(async () => {
    await resetDb();
    await signInAsAdmin(await createAdmin());
  });

  it("gives each activity its own share and no more", async () => {
    await activity("a1", "أ");
    await activity("a2", "ب");
    await activity("a3", "ج");

    await splitAcross(3001, [
      { activityId: "a1", amount: 1001 },
      { activityId: "a2", amount: 1000 },
      { activityId: "a3", amount: 1000 },
    ]);

    const spending = await spendingByKey();
    expect(spending["a1"]).toBe(1001);
    expect(spending["a2"]).toBe(1000);
    expect(spending["a3"]).toBe(1000);
  });

  it("keeps a split out of the general row", async () => {
    await activity("a1", "أ");
    await activity("a2", "ب");

    await splitAcross(500, [
      { activityId: "a1", amount: 200 },
      { activityId: "a2", amount: 300 },
    ]);

    expect((await spendingByKey())["general"] ?? 0).toBe(0);
  });

  it("shows an activity only its own share on its ledger", async () => {
    await activity("a1", "أ");
    await activity("a2", "ب");

    await splitAcross(500, [
      { activityId: "a1", amount: 200 },
      { activityId: "a2", amount: 300 },
    ]);

    const ledger = await ledgerFor("a1");
    expect(ledger.totals.expenses).toBe(200);
    expect(ledger.rows.filter((row) => row.kind === "expense")).toHaveLength(1);
    expect(ledger.rows[0].amount).toBe(200);
  });

  it("adds the shares back up to the whole amount across the report", async () => {
    await activity("a1", "أ");
    await activity("a2", "ب");

    await splitAcross(3001, [
      { activityId: "a1", amount: 1500 },
      { activityId: "a2", amount: 1501 },
    ]);

    const report = await activityFinanceReport(FROM, TO);
    expect(report.totals.spending).toBe(3001);
  });

  it("lists two lines when one expense is split twice onto the same activity", async () => {
    await activity("a1", "أ");

    await splitAcross(300, [
      { activityId: "a1", amount: 100 },
      { activityId: "a1", amount: 200 },
    ]);

    const ledger = await ledgerFor("a1");
    expect(ledger.rows.filter((row) => row.kind === "expense")).toHaveLength(2);
    expect(ledger.totals.expenses).toBe(300);
  });
});
