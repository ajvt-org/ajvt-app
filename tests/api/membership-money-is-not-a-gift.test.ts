import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { money } from "@/lib/messages";
import { resetDb, del, patch, createAdmin, signInAsAdmin, withId, giveGift } from "./helpers";

import { PATCH as UPDATE, DELETE as REMOVE } from "@/app/api/admin/donations/[id]/route";

function membershipMoney() {
  return prisma.payment.create({
    data: {
      purpose: "MEMBERSHIP",
      amount: 2000,
      feeApplied: 100,
      status: "ACTIVE",
      donorName: "أحمد",
    },
  });
}

const editing = (id: string, body: unknown) =>
  UPDATE(patch(`/api/admin/donations/${id}`, body), withId(id));

const removing = (id: string) => REMOVE(del(`/api/admin/donations/${id}`), withId(id));

describe("a membership payment reached through the gifts route", () => {
  beforeEach(async () => {
    await resetDb();
    await signInAsAdmin(await createAdmin("boss", "SUPER"));
  });

  it("cannot be edited", async () => {
    const payment = await membershipMoney();

    const res = await editing(payment.id, { anonymous: true });

    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe(money.membershipDonationReadOnly);
    expect((await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } })).anonymous).toBe(
      false,
    );
  });

  it("cannot have its amount corrected either", async () => {
    const payment = await membershipMoney();

    const res = await editing(payment.id, { amount: 9000 });

    expect(res.status).toBe(400);
    expect((await prisma.payment.findUniqueOrThrow({ where: { id: payment.id } })).amount).toBe(
      2000,
    );
  });

  it("cannot be deleted", async () => {
    const payment = await membershipMoney();

    const res = await removing(payment.id);

    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe(money.membershipDonationReadOnly);
    expect(await prisma.payment.count({ where: { id: payment.id } })).toBe(1);
  });
});

describe("a gift reached through the gifts route", () => {
  beforeEach(async () => {
    await resetDb();
    await signInAsAdmin(await createAdmin("boss", "SUPER"));
  });

  it("can still be edited", async () => {
    const gift = await giveGift({ donorName: "فاعل خير", amount: 5000 });

    const res = await editing(gift.id, { amount: 7000 });

    expect(res.status).toBe(200);
    expect((await prisma.payment.findUniqueOrThrow({ where: { id: gift.id } })).amount).toBe(7000);
  });

  it("can still be deleted", async () => {
    const gift = await giveGift({ donorName: "فاعل خير", amount: 5000 });

    const res = await removing(gift.id);

    expect(res.status).toBe(200);
    expect(await prisma.payment.count({ where: { id: gift.id } })).toBe(0);
  });
});

describe("an id the payments table does not hold", () => {
  beforeEach(async () => {
    await resetDb();
    await signInAsAdmin(await createAdmin("boss", "SUPER"));
  });

  it("is not found when an edit is tried", async () => {
    const res = await editing("nothing-here", { amount: 7000 });

    expect(res.status).toBe(404);
    expect((await res.json()).error).toBe(money.donationNotFound);
  });

  it("is not found when a delete is tried", async () => {
    const res = await removing("nothing-here");

    expect(res.status).toBe(404);
    expect((await res.json()).error).toBe(money.donationNotFound);
  });

  it("is not found when the id belongs to a row only the old table holds", async () => {
    const leftover = await prisma.donation.create({
      data: { amount: 1900, source: "MEMBERSHIP", status: "ACTIVE" },
    });

    expect((await editing(leftover.id, { amount: 7000 })).status).toBe(404);
    expect((await removing(leftover.id)).status).toBe(404);
  });
});
