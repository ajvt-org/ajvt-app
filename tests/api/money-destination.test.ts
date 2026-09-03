import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { resetDb, post, patch, createAdmin, signInAsAdmin, withId } from "./helpers";
import { common } from "@/lib/messages";
import { DEFAULT_BOARDS, DEFAULT_CURVE } from "@/lib/competitionConfig";

import { POST as RECORD_GIFT } from "@/app/api/admin/donations/route";
import { PATCH as UPDATE_GIFT } from "@/app/api/admin/donations/[id]/route";
import { POST as RECORD_EXPENSE } from "@/app/api/admin/expenses/route";
import { PATCH as UPDATE_EXPENSE } from "@/app/api/admin/expenses/[id]/route";

function activity(title = "القافلة الصحية") {
  return prisma.activity.create({ data: { title, description: "وصف" } });
}

function competition(name = "مسابقة رمضان") {
  return prisma.competition.create({
    data: {
      name,
      startsAt: new Date("2026-08-20T08:00:00.000Z"),
      roundCount: 3,
      roundPeriodMinutes: 1440,
      roundWindowMinutes: 840,
      servedCount: 3,
      boards: { create: DEFAULT_BOARDS.map((b, order) => ({ ...b, order })) },
      ...DEFAULT_CURVE,
    },
  });
}

function gift(amount = 5000) {
  return prisma.donation.create({
    data: { donorName: "فاعل خير", amount, source: "PUBLIC", status: "ACTIVE" },
  });
}

function spending(label = "طباعة") {
  return prisma.expense.create({ data: { label, amount: 1200, createdBy: "boss" } });
}

const updateGift = (id: string, body: unknown) =>
  UPDATE_GIFT(patch(`/api/admin/donations/${id}`, body), withId(id));

const updateExpense = (id: string, body: unknown) =>
  UPDATE_EXPENSE(patch(`/api/admin/expenses/${id}`, body), withId(id));

describe("a quiz as a place money goes", () => {
  beforeEach(async () => {
    await resetDb();
    await signInAsAdmin(await createAdmin("boss", "SUPER"));
  });

  it("takes a hand-recorded gift", async () => {
    const quiz = await competition();

    const res = await RECORD_GIFT(
      post("/api/admin/donations", { donorName: "أحمد", amount: 3000, competitionId: quiz.id }),
    );

    expect(res.status).toBe(201);
    const donation = await prisma.donation.findFirstOrThrow();
    expect(donation.competitionId).toBe(quiz.id);
    expect(donation.activityId).toBeNull();
  });

  it("carries the quiz onto the mirrored payment", async () => {
    const quiz = await competition();

    await RECORD_GIFT(
      post("/api/admin/donations", { donorName: "أحمد", amount: 3000, competitionId: quiz.id }),
    );

    const payment = await prisma.payment.findFirstOrThrow();
    expect(payment.competitionId).toBe(quiz.id);
    expect(payment.activityId).toBeNull();
  });

  it("takes an expense", async () => {
    const quiz = await competition();

    const res = await RECORD_EXPENSE(
      post("/api/admin/expenses", { label: "جوائز", amount: 4000, competitionId: quiz.id }),
    );

    expect(res.status).toBe(201);
    expect((await prisma.expense.findFirstOrThrow()).competitionId).toBe(quiz.id);
  });

  it("takes a gift that was already recorded", async () => {
    const quiz = await competition();
    const donation = await gift();

    expect((await updateGift(donation.id, { competitionId: quiz.id })).status).toBe(200);

    expect(
      (await prisma.donation.findUniqueOrThrow({ where: { id: donation.id } })).competitionId,
    ).toBe(quiz.id);
  });

  it("takes an expense that was already recorded", async () => {
    const quiz = await competition();
    const expense = await spending();

    expect((await updateExpense(expense.id, { competitionId: quiz.id })).status).toBe(200);

    expect(
      (await prisma.expense.findUniqueOrThrow({ where: { id: expense.id } })).competitionId,
    ).toBe(quiz.id);
  });

  it("replaces an activity rather than sitting beside it", async () => {
    const caravan = await activity();
    const quiz = await competition();
    const donation = await gift();
    await updateGift(donation.id, { activityId: caravan.id });

    await updateGift(donation.id, { activityId: null, competitionId: quiz.id });

    const after = await prisma.donation.findUniqueOrThrow({ where: { id: donation.id } });
    expect(after.activityId).toBeNull();
    expect(after.competitionId).toBe(quiz.id);
  });

  it("refuses a quiz that does not exist and leaves the gift alone", async () => {
    const donation = await gift();

    const res = await updateGift(donation.id, { competitionId: "missing" });

    expect(res.status).toBe(400);
    expect(
      (await prisma.donation.findUniqueOrThrow({ where: { id: donation.id } })).competitionId,
    ).toBeNull();
  });
});

describe("a payment or an expense aimed at two places at once", () => {
  beforeEach(async () => {
    await resetDb();
    await signInAsAdmin(await createAdmin("boss", "SUPER"));
  });

  it("is refused when a gift is recorded by hand", async () => {
    const caravan = await activity();
    const quiz = await competition();

    const res = await RECORD_GIFT(
      post("/api/admin/donations", {
        donorName: "أحمد",
        amount: 3000,
        activityId: caravan.id,
        competitionId: quiz.id,
      }),
    );

    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ error: common.oneDestinationOnly });
    expect(await prisma.donation.count()).toBe(0);
  });

  it("is refused when a recorded gift is edited", async () => {
    const caravan = await activity();
    const quiz = await competition();
    const donation = await gift();

    const res = await updateGift(donation.id, {
      activityId: caravan.id,
      competitionId: quiz.id,
    });

    expect(res.status).toBe(400);
    const after = await prisma.donation.findUniqueOrThrow({ where: { id: donation.id } });
    expect(after.activityId).toBeNull();
    expect(after.competitionId).toBeNull();
  });

  it("is refused when an expense is recorded", async () => {
    const caravan = await activity();
    const quiz = await competition();

    const res = await RECORD_EXPENSE(
      post("/api/admin/expenses", {
        label: "جوائز",
        amount: 4000,
        activityId: caravan.id,
        competitionId: quiz.id,
      }),
    );

    expect(res.status).toBe(400);
    expect(await prisma.expense.count()).toBe(0);
  });

  it("is refused when a recorded expense is edited", async () => {
    const caravan = await activity();
    const quiz = await competition();
    const expense = await spending();

    const res = await updateExpense(expense.id, {
      activityId: caravan.id,
      competitionId: quiz.id,
    });

    expect(res.status).toBe(400);
    const after = await prisma.expense.findUniqueOrThrow({ where: { id: expense.id } });
    expect(after.activityId).toBeNull();
    expect(after.competitionId).toBeNull();
  });
});
