import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { resetDb, get, createUser, signInAs, makeMember } from "./helpers";

import { GET as RECEIPTS } from "@/app/api/user/receipts/route";
import { ensureReceiptsFor } from "@/lib/paymentReceiptServer";

const read = async () => {
  await ensureReceiptsFor(prisma, {});
  return RECEIPTS(get("/api/user/receipts"));
};

async function memberFor(user: { id: string }, over: Record<string, unknown> = {}) {
  return makeMember({
    userId: user.id,
    fullName: "محمد",
    age: "البدريين",
    paymentMethod: "بنكيلي",
    status: "ACTIVE",
    memberNumber: `AJVT-${Math.floor(Math.random() * 100000)}`,
    ...over,
  });
}

describe("the receipts a member can take away", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("hands back an accepted payment with what a receipt needs", async () => {
    const user = await createUser("22000001");
    const member = await memberFor(user);
    await prisma.payment.create({
      data: {
        purpose: "MEMBERSHIP",
        amount: 1000,
        year: 2026,
        status: "ACTIVE",
        userId: member.userId,
      },
    });
    await signInAs(user);

    const body = await (await read()).json();

    expect(body.receipts).toHaveLength(1);
    expect(body.receipts[0]).toMatchObject({
      amount: 1000,
      reason: "اشتراك عضوية 2026",
      payerName: "محمد",
      status: "ACTIVE",
    });
    expect(body.receipts[0].number).toMatch(/^R-\d{4}-\d{4}$/);
    expect(body.receipts[0].token).toHaveLength(32);
  });

  it("gives a receipt for a gift as well as a subscription", async () => {
    const user = await createUser("22000001");
    const member = await memberFor(user);
    await prisma.payment.create({
      data: {
        purpose: "DONATION",
        amount: 5000,
        status: "ACTIVE",
        userId: member.userId,
      },
    });
    await signInAs(user);

    const body = await (await read()).json();

    expect(body.receipts[0]).toMatchObject({ reason: "تبرع", amount: 5000 });
  });

  it("hands back nothing for a payment still awaiting review", async () => {
    const user = await createUser("22000001");
    const member = await memberFor(user);
    await prisma.payment.create({
      data: {
        purpose: "DONATION",
        amount: 500,
        status: "PENDING",
        userId: member.userId,
      },
    });
    await signInAs(user);

    expect((await (await read()).json()).receipts).toEqual([]);
  });

  it("never hands back another member's payment", async () => {
    const mine = await createUser("22000001");
    const other = await createUser("22000002");
    await memberFor(mine);
    const theirs = await memberFor(other, { fullName: "أحمد" });
    await prisma.payment.create({
      data: {
        purpose: "DONATION",
        amount: 9000,
        status: "ACTIVE",
        userId: theirs.userId,
      },
    });
    await signInAs(mine);

    expect((await (await read()).json()).receipts).toEqual([]);
  });

  it("names the activity a gift supported", async () => {
    const user = await createUser("22000001");
    const member = await memberFor(user);
    const activity = await prisma.activity.create({
      data: { title: "القافلة الصحية", description: "وصف" },
    });
    await prisma.payment.create({
      data: {
        purpose: "ACTIVITY",
        amount: 2000,
        status: "ACTIVE",
        userId: member.userId,
        activityId: activity.id,
      },
    });
    await signInAs(user);

    expect((await (await read()).json()).receipts[0].reason).toBe("دعم نشاط — القافلة الصحية");
  });

  it("puts the most recent payment first", async () => {
    const user = await createUser("22000001");
    const member = await memberFor(user);
    await prisma.payment.create({
      data: {
        purpose: "DONATION",
        amount: 100,
        status: "ACTIVE",
        userId: member.userId,
        createdAt: new Date("2026-01-01T00:00:00Z"),
      },
    });
    await prisma.payment.create({
      data: {
        purpose: "DONATION",
        amount: 200,
        status: "ACTIVE",
        userId: member.userId,
        createdAt: new Date("2026-06-01T00:00:00Z"),
      },
    });
    await signInAs(user);

    expect((await (await read()).json()).receipts.map((r: { amount: number }) => r.amount)).toEqual(
      [200, 100],
    );
  });

  it("refuses a caller with no session", async () => {
    expect((await read()).status).toBe(401);
  });
});
