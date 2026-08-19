import { describe, it, expect, beforeEach } from "vitest";
import { POST as CREATE_EXPENSE, GET as LIST_EXPENSES } from "@/app/api/admin/expenses/route";
import { PATCH as UPDATE_EXPENSE } from "@/app/api/admin/expenses/[id]/route";
import { PATCH as UPDATE_DONATION } from "@/app/api/admin/donations/[id]/route";
import { GET as SUMMARY } from "@/app/api/admin/finance/summary/route";
import { prisma } from "@/lib/prisma";
import { resetDb, get, post, patch, createAdmin, signInAsAdmin } from "./helpers";

function withId(id: string) {
  return { params: Promise.resolve({ id }) };
}

async function activity(title: string) {
  return prisma.activity.create({ data: { title, description: "وصف" } });
}

function addExpense(body: Record<string, unknown>) {
  return CREATE_EXPENSE(post("/api/admin/expenses", { label: "شراء", amount: 100, ...body }));
}

async function donation(amount: number) {
  return prisma.donation.create({ data: { donorName: "أحمد", amount, status: "ACTIVE" } });
}

async function summaryFor(activityId?: string) {
  const url = activityId
    ? `/api/admin/finance/summary?activityId=${activityId}`
    : "/api/admin/finance/summary";
  return (await (await SUMMARY(get(url))).json()) as {
    totalExpenses: number;
    totalRevenue: number;
  };
}

describe("attaching finance to an activity", () => {
  beforeEach(async () => {
    await resetDb();
    await signInAsAdmin(await createAdmin());
  });

  it("creates an expense with no activity by default", async () => {
    const res = await addExpense({});

    expect(res.status).toBe(201);
    expect((await res.json()).expense.activity).toBeNull();
  });

  it("attaches an activity on create", async () => {
    const a = await activity("القافلة الصحية");

    const body = await (await addExpense({ activityId: a.id })).json();

    expect(body.expense.activity).toMatchObject({ id: a.id, title: "القافلة الصحية" });
  });

  it("attaches and detaches on update", async () => {
    const a = await activity("البطولة الكبرى");
    const created = (await (await addExpense({})).json()).expense;

    const attached = await UPDATE_EXPENSE(
      patch(`/api/admin/expenses/${created.id}`, { activityId: a.id }),
      withId(created.id),
    );
    expect((await attached.json()).expense.activity.id).toBe(a.id);

    const detached = await UPDATE_EXPENSE(
      patch(`/api/admin/expenses/${created.id}`, { activityId: null }),
      withId(created.id),
    );
    expect((await detached.json()).expense.activity).toBeNull();
  });

  it("carries the activity through the list", async () => {
    const a = await activity("حملة النظافة");
    await addExpense({ activityId: a.id });

    const { expenses } = await (await LIST_EXPENSES()).json();

    expect(expenses[0].activity.title).toBe("حملة النظافة");
  });

  it("attaches a donation to an activity", async () => {
    const a = await activity("القافلة الصحية");
    const d = await donation(500);

    const res = await UPDATE_DONATION(
      patch(`/api/admin/donations/${d.id}`, { activityId: a.id }),
      withId(d.id),
    );

    expect(res.status).toBe(200);
    const row = await prisma.donation.findUniqueOrThrow({ where: { id: d.id } });
    expect(row.activityId).toBe(a.id);
  });

  it("scopes the finance summary to one activity", async () => {
    const a = await activity("القافلة الصحية");
    const other = await activity("البطولة");
    await addExpense({ activityId: a.id, amount: 300 });
    await addExpense({ activityId: other.id, amount: 700 });
    await addExpense({ amount: 50 });

    const scoped = await summaryFor(a.id);
    const all = await summaryFor();

    expect(scoped.totalExpenses).toBe(300);
    expect(all.totalExpenses).toBe(1050);
  });

  it("counts only the activity's donations as its revenue", async () => {
    const a = await activity("القافلة الصحية");
    const mine = await donation(500);
    await donation(900);
    await UPDATE_DONATION(
      patch(`/api/admin/donations/${mine.id}`, { activityId: a.id }),
      withId(mine.id),
    );

    expect((await summaryFor(a.id)).totalRevenue).toBe(500);
  });

  it("keeps membership fees out of an activity summary", async () => {
    const a = await activity("القافلة الصحية");
    const m = await prisma.member.create({
      data: {
        fullName: "عضو",
        age: "البدريين",
        paymentMethod: "بنكيلي",
        status: "ACTIVE",
      },
    });
    const { recordMembershipPayment } = await import("@/lib/membershipPaymentServer");
    await recordMembershipPayment(prisma, m.id, 100, 100);

    expect((await summaryFor(a.id)).totalRevenue).toBe(0);
    expect((await summaryFor()).totalRevenue).toBe(100);
  });
});
