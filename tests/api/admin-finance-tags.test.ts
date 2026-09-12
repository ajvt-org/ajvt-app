import { describe, it, expect, beforeEach } from "vitest";
import { GET as LIST_TAGS, POST as CREATE_TAG } from "@/app/api/admin/finance-tags/route";
import { PATCH as RENAME_TAG, DELETE as DELETE_TAG } from "@/app/api/admin/finance-tags/[id]/route";
import { POST as CREATE_EXPENSE, GET as LIST_EXPENSES } from "@/app/api/admin/expenses/route";
import { PATCH as UPDATE_EXPENSE } from "@/app/api/admin/expenses/[id]/route";
import { prisma } from "@/lib/prisma";
import { PATCH as UPDATE_DONATION } from "@/app/api/admin/donations/[id]/route";
import { MEMBERSHIP_FEE } from "@/lib/donations";
import { runningYear } from "@/lib/membershipYear";
import {
  resetDb,
  post,
  patch,
  createAdmin,
  signInAsAdmin,
  withId,
  makeMember,
  giveGift,
} from "./helpers";

async function aTag(name: string) {
  return prisma.financeTag.create({ data: { name } });
}

describe("expense tags", () => {
  beforeEach(async () => {
    await resetDb();
    await signInAsAdmin(await createAdmin());
  });

  it("refuses an anonymous caller", async () => {
    await resetDb();

    expect((await LIST_TAGS()).status).toBe(401);
    expect((await CREATE_TAG(post("/api/admin/finance-tags", { name: "نقل" }))).status).toBe(401);
    expect(await prisma.financeTag.count()).toBe(0);
  });

  it("creates a tag", async () => {
    const res = await CREATE_TAG(post("/api/admin/finance-tags", { name: "نقل" }));

    expect(res.status).toBe(201);
    expect(await prisma.financeTag.count()).toBe(1);
  });

  it("will not take a blank name", async () => {
    expect((await CREATE_TAG(post("/api/admin/finance-tags", { name: "   " }))).status).toBe(400);
    expect(await prisma.financeTag.count()).toBe(0);
  });

  it("will not take the same name twice", async () => {
    await aTag("نقل");

    const res = await CREATE_TAG(post("/api/admin/finance-tags", { name: "نقل" }));

    expect(res.status).toBe(409);
    expect(await prisma.financeTag.count()).toBe(1);
  });

  it("renames a tag without touching what it is on", async () => {
    const tag = await aTag("نقل");
    await prisma.expense.create({
      data: { label: "حافلة", amount: 5000, createdBy: "admin", tags: { connect: { id: tag.id } } },
    });

    const res = await RENAME_TAG(
      post(`/api/admin/finance-tags/${tag.id}`, { name: "مواصلات" }),
      withId(tag.id),
    );

    expect(res.status).toBe(200);
    const after = await prisma.expense.findFirstOrThrow({ include: { tags: true } });
    expect(after.tags.map((t) => t.name)).toEqual(["مواصلات"]);
  });

  it("keeps the expenses when a tag is deleted", async () => {
    const tag = await aTag("نقل");
    await prisma.expense.create({
      data: { label: "حافلة", amount: 5000, createdBy: "admin", tags: { connect: { id: tag.id } } },
    });

    const res = await DELETE_TAG(post(`/api/admin/finance-tags/${tag.id}`, {}), withId(tag.id));

    expect(res.status).toBe(200);
    expect(await prisma.expense.count()).toBe(1);
    expect(await prisma.financeTag.count()).toBe(0);
  });

  it("totals what has been spent under each tag", async () => {
    const transport = await aTag("نقل");
    const gear = await aTag("تجهيزات");
    await prisma.expense.create({
      data: {
        label: "حافلة",
        amount: 5000,
        createdBy: "admin",
        tags: { connect: [{ id: transport.id }, { id: gear.id }] },
      },
    });
    await prisma.expense.create({
      data: {
        label: "وقود",
        amount: 3000,
        createdBy: "admin",
        tags: { connect: { id: transport.id } },
      },
    });

    const { tags } = await (await LIST_TAGS()).json();
    const byName = new Map(tags.map((t: { name: string }) => [t.name, t]));

    expect(byName.get("نقل")).toMatchObject({ count: 2, total: 8000 });
    expect(byName.get("تجهيزات")).toMatchObject({ count: 1, total: 5000 });
  });
});

describe("tagging an expense", () => {
  beforeEach(async () => {
    await resetDb();
    await signInAsAdmin(await createAdmin());
  });

  it("tags an expense as it is recorded", async () => {
    const tag = await aTag("نقل");

    const res = await CREATE_EXPENSE(
      post("/api/admin/expenses", { label: "حافلة", amount: 5000, tagIds: [tag.id] }),
    );

    expect(res.status).toBe(201);
    const expense = await prisma.expense.findFirstOrThrow({ include: { tags: true } });
    expect(expense.tags.map((t) => t.name)).toEqual(["نقل"]);
  });

  it("carries the tags back with the list", async () => {
    const tag = await aTag("نقل");
    await prisma.expense.create({
      data: { label: "حافلة", amount: 5000, createdBy: "admin", tags: { connect: { id: tag.id } } },
    });

    const { expenses } = await (await LIST_EXPENSES()).json();

    expect(expenses[0].tags).toEqual([{ id: tag.id, name: "نقل" }]);
  });

  it("replaces the tags on edit rather than adding to them", async () => {
    const transport = await aTag("نقل");
    const gear = await aTag("تجهيزات");
    const expense = await prisma.expense.create({
      data: {
        label: "حافلة",
        amount: 5000,
        createdBy: "admin",
        tags: { connect: { id: transport.id } },
      },
    });

    const res = await UPDATE_EXPENSE(
      post(`/api/admin/expenses/${expense.id}`, { tagIds: [gear.id] }),
      withId(expense.id),
    );

    expect(res.status).toBe(200);
    const after = await prisma.expense.findFirstOrThrow({ include: { tags: true } });
    expect(after.tags.map((t) => t.name)).toEqual(["تجهيزات"]);
  });

  it("takes every tag off when an empty list is sent", async () => {
    const tag = await aTag("نقل");
    const expense = await prisma.expense.create({
      data: { label: "حافلة", amount: 5000, createdBy: "admin", tags: { connect: { id: tag.id } } },
    });

    await UPDATE_EXPENSE(
      post(`/api/admin/expenses/${expense.id}`, { tagIds: [] }),
      withId(expense.id),
    );

    const after = await prisma.expense.findFirstOrThrow({ include: { tags: true } });
    expect(after.tags).toEqual([]);
  });

  it("leaves the tags alone when the edit does not mention them", async () => {
    const tag = await aTag("نقل");
    const expense = await prisma.expense.create({
      data: { label: "حافلة", amount: 5000, createdBy: "admin", tags: { connect: { id: tag.id } } },
    });

    await UPDATE_EXPENSE(
      post(`/api/admin/expenses/${expense.id}`, { amount: 6000 }),
      withId(expense.id),
    );

    const after = await prisma.expense.findFirstOrThrow({ include: { tags: true } });
    expect(after.amount).toBe(6000);
    expect(after.tags.map((t) => t.name)).toEqual(["نقل"]);
  });
});

describe("tagging income", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("puts a tag on a donation and totals it as income", async () => {
    await signInAsAdmin(await createAdmin());
    const tag = await prisma.financeTag.create({ data: { name: "القافلة الصحية" } });
    const donation = await giveGift({ donorName: "فاعل خير", amount: 500 });

    const res = await UPDATE_DONATION(
      patch(`/api/admin/donations/${donation.id}`, { tagIds: [tag.id] }),
      withId(donation.id),
    );
    expect(res.status).toBe(200);

    const { tags } = await (await LIST_TAGS()).json();
    expect(tags[0]).toMatchObject({ name: "القافلة الصحية", income: 500, incomeCount: 1 });
  });

  it("counts a tagged membership for what it gave above the fee and not the fee itself", async () => {
    await signInAsAdmin(await createAdmin());
    const tag = await prisma.financeTag.create({ data: { name: "القافلة الصحية" } });
    const member = await makeMember({
      fullName: "محمد ولد أحمد",
      age: "البدريين",
      paymentMethod: "بنكيلي",
      status: "ACTIVE",
      membershipYear: runningYear(),
      paidAmount: MEMBERSHIP_FEE + 2000,
    });
    const payment = await prisma.payment.findFirstOrThrow({
      where: { userId: member.userId, purpose: "MEMBERSHIP" },
    });
    await prisma.payment.update({
      where: { id: payment.id },
      data: { tags: { connect: [{ id: tag.id }] } },
    });

    const { tags } = await (await LIST_TAGS()).json();
    expect(tags[0]).toMatchObject({ income: 2000, incomeCount: 1 });
  });

  it("leaves a tagged membership that gave nothing above the fee out of the income", async () => {
    await signInAsAdmin(await createAdmin());
    const tag = await prisma.financeTag.create({ data: { name: "مصاريف عامة" } });
    const member = await makeMember({
      fullName: "أحمد ولد سالم",
      age: "البدريين",
      paymentMethod: "بنكيلي",
      status: "ACTIVE",
      membershipYear: runningYear(),
      paidAmount: MEMBERSHIP_FEE,
    });
    const payment = await prisma.payment.findFirstOrThrow({
      where: { userId: member.userId, purpose: "MEMBERSHIP" },
    });
    await prisma.payment.update({
      where: { id: payment.id },
      data: { tags: { connect: [{ id: tag.id }] } },
    });

    const { tags } = await (await LIST_TAGS()).json();
    expect(tags[0]).toMatchObject({ income: 0, incomeCount: 0 });
  });

  it("leaves a rejected donation out of the income total", async () => {
    await signInAsAdmin(await createAdmin());
    const tag = await prisma.financeTag.create({ data: { name: "مصاريف عامة" } });
    const donation = await giveGift({ donorName: "فاعل خير", amount: 500, status: "REJECTED" });
    await UPDATE_DONATION(
      patch(`/api/admin/donations/${donation.id}`, { tagIds: [tag.id] }),
      withId(donation.id),
    );

    const { tags } = await (await LIST_TAGS()).json();
    expect(tags[0]).toMatchObject({ income: 0, incomeCount: 0 });
  });
});
