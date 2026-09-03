import { describe, it, expect, beforeEach } from "vitest";
import { POST } from "@/app/api/admin/expenses/route";
import { PATCH, DELETE } from "@/app/api/admin/expenses/[id]/route";
import { prisma } from "@/lib/prisma";
import { resetDb, post, patch, createAdmin, signInAsAdmin, withId } from "./helpers";

function patching(id: string, body: unknown) {
  return [patch(`/api/admin/expenses/${id}`, body), withId(id)] as const;
}

async function allocationsOf(id: string) {
  return prisma.expenseAllocation.findMany({
    where: { expenseId: id },
    select: { amount: true, activityId: true, competitionId: true },
  });
}

async function anActivity(id: string, title: string) {
  return prisma.activity.create({ data: { id, title, description: "d" } });
}

async function aCompetition(id: string) {
  await prisma.questionBank.upsert({
    where: { id: "bank" },
    update: {},
    create: { id: "bank", name: "bank" },
  });
  return prisma.competition.create({
    data: { id, name: "C", startsAt: new Date(), bankId: "bank" },
  });
}

async function record(body: Record<string, unknown>) {
  const res = await POST(post("/api/admin/expenses", { label: "إيجار", amount: 1000, ...body }));
  return (await res.json()).expense as { id: string };
}

describe("an expense always carries its allocation", () => {
  beforeEach(async () => {
    await resetDb();
    await signInAsAdmin(await createAdmin());
  });

  it("gets one carrying the whole amount when it is recorded", async () => {
    const expense = await record({});

    expect(await allocationsOf(expense.id)).toEqual([
      { amount: 1000, activityId: null, competitionId: null },
    ]);
  });

  it("carries the activity it was recorded against", async () => {
    await anActivity("a1", "A1");

    const expense = await record({ activityId: "a1" });

    expect(await allocationsOf(expense.id)).toEqual([
      { amount: 1000, activityId: "a1", competitionId: null },
    ]);
  });

  it("carries the competition it was recorded against", async () => {
    await aCompetition("c1");

    const expense = await record({ competitionId: "c1" });

    expect(await allocationsOf(expense.id)).toEqual([
      { amount: 1000, activityId: null, competitionId: "c1" },
    ]);
  });

  it("follows the amount when the amount is corrected", async () => {
    const expense = await record({});

    await PATCH(...patching(expense.id, { amount: 2500 }));

    expect(await allocationsOf(expense.id)).toEqual([
      { amount: 2500, activityId: null, competitionId: null },
    ]);
  });

  it("follows the destination when the destination is changed", async () => {
    await anActivity("a1", "A1");
    const expense = await record({ activityId: "a1" });

    await PATCH(...patching(expense.id, { activityId: null, competitionId: null }));

    expect(await allocationsOf(expense.id)).toEqual([
      { amount: 1000, activityId: null, competitionId: null },
    ]);
  });

  it("moves from an activity to a competition without leaving the old one behind", async () => {
    await anActivity("a1", "A1");
    await aCompetition("c1");
    const expense = await record({ activityId: "a1" });

    await PATCH(...patching(expense.id, { activityId: null, competitionId: "c1" }));

    expect(await allocationsOf(expense.id)).toEqual([
      { amount: 1000, activityId: null, competitionId: "c1" },
    ]);
  });

  it("stays a single row through an edit that touches neither", async () => {
    const expense = await record({});

    await PATCH(...patching(expense.id, { label: "إيجار الملعب" }));

    expect(await allocationsOf(expense.id)).toHaveLength(1);
  });

  it("goes away with the expense", async () => {
    const expense = await record({});

    await DELETE(...patching(expense.id, {}));

    expect(await allocationsOf(expense.id)).toEqual([]);
  });

  it("never leaves an expense without one", async () => {
    await anActivity("a1", "A1");
    await record({});
    await record({ activityId: "a1" });

    const orphans = await prisma.expense.findMany({
      where: { allocations: { none: {} } },
      select: { id: true },
    });
    expect(orphans).toEqual([]);
  });
});
