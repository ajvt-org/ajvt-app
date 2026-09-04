import { describe, it, expect, beforeEach } from "vitest";
import { POST } from "@/app/api/admin/expenses/route";
import { PATCH } from "@/app/api/admin/expenses/[id]/route";
import { prisma } from "@/lib/prisma";
import { resetDb, post, patch, createAdmin, signInAsAdmin, withId } from "./helpers";

function patching(id: string, body: unknown) {
  return [patch(`/api/admin/expenses/${id}`, body), withId(id)] as const;
}

async function activity(id: string) {
  return prisma.activity.create({ data: { id, title: `نشاط ${id}`, description: "وصف" } });
}

async function competition(id: string) {
  await prisma.questionBank.upsert({
    where: { id: "bank" },
    update: {},
    create: { id: "bank", name: "bank" },
  });
  return prisma.competition.create({
    data: { id, name: `مسابقة ${id}`, startsAt: new Date(), bankId: "bank" },
  });
}

async function record(body: Record<string, unknown>) {
  const res = await POST(post("/api/admin/expenses", { label: "فاتورة", amount: 3001, ...body }));
  return { status: res.status, body: await res.json() };
}

async function sharesOf(id: string) {
  const rows = await prisma.expenseAllocation.findMany({
    where: { expenseId: id },
    orderBy: { createdAt: "asc" },
    select: { amount: true, activityId: true, competitionId: true },
  });
  return rows;
}

describe("recording one expense across several destinations", () => {
  beforeEach(async () => {
    await resetDb();
    await signInAsAdmin(await createAdmin());
    await activity("a1");
    await activity("a2");
    await activity("a3");
    await competition("c1");
  });

  it("keeps a share for each destination", async () => {
    const made = await record({
      allocations: [
        { activityId: "a1", amount: 1001 },
        { activityId: "a2", amount: 1000 },
        { activityId: "a3", amount: 1000 },
      ],
    });

    expect(made.status).toBe(201);
    expect(await sharesOf(made.body.expense.id)).toEqual([
      { amount: 1001, activityId: "a1", competitionId: null },
      { amount: 1000, activityId: "a2", competitionId: null },
      { amount: 1000, activityId: "a3", competitionId: null },
    ]);
  });

  it("mixes an activity and a competition", async () => {
    const made = await record({
      amount: 500,
      allocations: [
        { activityId: "a1", amount: 200 },
        { competitionId: "c1", amount: 300 },
      ],
    });

    expect(made.status).toBe(201);
    expect(await sharesOf(made.body.expense.id)).toEqual([
      { amount: 200, activityId: "a1", competitionId: null },
      { amount: 300, activityId: null, competitionId: "c1" },
    ]);
  });

  it("refuses shares that do not add up to the amount", async () => {
    const made = await record({
      allocations: [
        { activityId: "a1", amount: 1000 },
        { activityId: "a2", amount: 1000 },
      ],
    });

    expect(made.status).toBe(400);
    expect(await prisma.expense.count()).toBe(0);
  });

  it("refuses shares that overshoot by a single unit", async () => {
    const made = await record({
      amount: 1000,
      allocations: [
        { activityId: "a1", amount: 500 },
        { activityId: "a2", amount: 501 },
      ],
    });

    expect(made.status).toBe(400);
    expect(await prisma.expense.count()).toBe(0);
  });

  it("refuses a share of zero or less", async () => {
    const made = await record({
      amount: 1000,
      allocations: [
        { activityId: "a1", amount: 1000 },
        { activityId: "a2", amount: 0 },
      ],
    });

    expect(made.status).toBe(400);
  });

  it("refuses the same destination twice", async () => {
    const made = await record({
      amount: 1000,
      allocations: [
        { activityId: "a1", amount: 400 },
        { activityId: "a1", amount: 600 },
      ],
    });

    expect(made.status).toBe(400);
  });

  it("refuses a destination that does not exist", async () => {
    const made = await record({
      amount: 1000,
      allocations: [{ activityId: "nope", amount: 1000 }],
    });

    expect(made.status).toBe(400);
  });

  it("leaves the old columns empty when there is more than one destination", async () => {
    const made = await record({
      allocations: [
        { activityId: "a1", amount: 1500 },
        { activityId: "a2", amount: 1501 },
      ],
    });

    const expense = await prisma.expense.findUniqueOrThrow({
      where: { id: made.body.expense.id },
    });
    expect(expense.activityId).toBeNull();
    expect(expense.competitionId).toBeNull();
  });

  it("still fills the old columns when there is only one", async () => {
    const made = await record({ allocations: [{ activityId: "a1", amount: 3001 }] });

    const expense = await prisma.expense.findUniqueOrThrow({
      where: { id: made.body.expense.id },
    });
    expect(expense.activityId).toBe("a1");
  });

  it("records a single destination expense the way it always did", async () => {
    const made = await record({ amount: 700, activityId: "a1" });

    expect(made.status).toBe(201);
    expect(await sharesOf(made.body.expense.id)).toEqual([
      { amount: 700, activityId: "a1", competitionId: null },
    ]);
  });
});

describe("editing an expense that covers several destinations", () => {
  beforeEach(async () => {
    await resetDb();
    await signInAsAdmin(await createAdmin());
    await activity("a1");
    await activity("a2");
  });

  async function aSplit() {
    const made = await record({
      amount: 1000,
      allocations: [
        { activityId: "a1", amount: 400 },
        { activityId: "a2", amount: 600 },
      ],
    });
    return made.body.expense.id as string;
  }

  it("leaves the split alone when something else is corrected", async () => {
    const id = await aSplit();

    const res = await PATCH(...patching(id, { label: "فاتورة الخطاط" }));

    expect(res.status).toBe(200);
    expect(await sharesOf(id)).toHaveLength(2);
  });

  it("takes a new set of shares", async () => {
    const id = await aSplit();

    const res = await PATCH(
      ...patching(id, {
        allocations: [
          { activityId: "a1", amount: 250 },
          { activityId: "a2", amount: 750 },
        ],
      }),
    );

    expect(res.status).toBe(200);
    expect((await sharesOf(id)).map((s) => s.amount)).toEqual([250, 750]);
  });

  it("refuses a new set that does not add up", async () => {
    const id = await aSplit();

    const res = await PATCH(...patching(id, { allocations: [{ activityId: "a1", amount: 999 }] }));

    expect(res.status).toBe(400);
    expect((await sharesOf(id)).map((s) => s.amount)).toEqual([400, 600]);
  });

  it("refuses an amount change on its own, since the shares would stop adding up", async () => {
    const id = await aSplit();

    const res = await PATCH(...patching(id, { amount: 2000 }));

    expect(res.status).toBe(400);
    const expense = await prisma.expense.findUniqueOrThrow({ where: { id } });
    expect(expense.amount).toBe(1000);
  });

  it("takes an amount and its shares together", async () => {
    const id = await aSplit();

    const res = await PATCH(
      ...patching(id, {
        amount: 2000,
        allocations: [
          { activityId: "a1", amount: 800 },
          { activityId: "a2", amount: 1200 },
        ],
      }),
    );

    expect(res.status).toBe(200);
    expect((await sharesOf(id)).map((s) => s.amount)).toEqual([800, 1200]);
  });

  it("collapses to one when a single destination is chosen instead", async () => {
    const id = await aSplit();

    const res = await PATCH(...patching(id, { activityId: "a1", competitionId: null }));

    expect(res.status).toBe(200);
    expect(await sharesOf(id)).toEqual([{ amount: 1000, activityId: "a1", competitionId: null }]);
  });

  it("still lets an amount be corrected on a single destination expense", async () => {
    const made = await record({ amount: 700, activityId: "a1" });

    const res = await PATCH(...patching(made.body.expense.id, { amount: 900 }));

    expect(res.status).toBe(200);
    expect(await sharesOf(made.body.expense.id)).toEqual([
      { amount: 900, activityId: "a1", competitionId: null },
    ]);
  });
});
