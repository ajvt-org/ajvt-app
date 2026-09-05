import { describe, it, expect, beforeEach } from "vitest";
import { PATCH } from "@/app/api/admin/donations/[id]/route";
import { POST as CREATE_DONATION } from "@/app/api/admin/donations/route";
import { POST as CREATE_MEMBERSHIP } from "@/app/api/admin/people/[id]/membership/route";
import { POST as CREATE_EXPENSE } from "@/app/api/admin/expenses/route";
import { PATCH as EDIT_EXPENSE } from "@/app/api/admin/expenses/[id]/route";
import { prisma } from "@/lib/prisma";
import { resetDb, patch, post, withId, createAdmin, createUser, signInAsAdmin } from "./helpers";

const METHOD = "بنكيلي";
const OTHER = "السداد";

async function accountOn(name: string) {
  const method = await prisma.paymentMethod.findUniqueOrThrow({ where: { name } });
  return prisma.paymentAccount.findFirstOrThrow({ where: { methodId: method.id } });
}

async function aDonation(paymentMethod = METHOD) {
  return prisma.donation.create({
    data: { amount: 5000, status: "ACTIVE", source: "PUBLIC", paymentMethod },
  });
}

function editing(id: string, body: unknown) {
  return [patch(`/api/admin/donations/${id}`, body), withId(id)] as const;
}

describe("recording which number a donation landed in", () => {
  beforeEach(async () => {
    await resetDb();
    await signInAsAdmin(await createAdmin());
  });

  it("saves the number an admin picked", async () => {
    const donation = await aDonation();
    const account = await accountOn(METHOD);

    const res = await PATCH(...editing(donation.id, { accountId: account.id }));

    expect(res.status).toBe(200);
    expect(
      (await prisma.donation.findUniqueOrThrow({ where: { id: donation.id } })).accountId,
    ).toBe(account.id);
  });

  it("reaches the unified table through the mirror", async () => {
    const donation = await aDonation();
    const account = await accountOn(METHOD);

    await PATCH(...editing(donation.id, { accountId: account.id }));

    const payment = await prisma.payment.findUnique({ where: { id: donation.id } });
    expect(payment?.accountId).toBe(account.id);
  });

  it("saves with no number at all, which an admin must be able to do", async () => {
    const donation = await aDonation();

    const res = await PATCH(...editing(donation.id, { amount: 6000 }));

    expect(res.status).toBe(200);
    expect(
      (await prisma.donation.findUniqueOrThrow({ where: { id: donation.id } })).accountId,
    ).toBeNull();
  });

  it("takes the number back off a record", async () => {
    const donation = await aDonation();
    const account = await accountOn(METHOD);
    await PATCH(...editing(donation.id, { accountId: account.id }));

    await PATCH(...editing(donation.id, { accountId: null }));

    expect(
      (await prisma.donation.findUniqueOrThrow({ where: { id: donation.id } })).accountId,
    ).toBeNull();
  });

  it("refuses a number that belongs to another method", async () => {
    const donation = await aDonation();
    const elsewhere = await accountOn(OTHER);

    const res = await PATCH(...editing(donation.id, { accountId: elsewhere.id }));

    expect(res.status).toBe(400);
    expect(
      (await prisma.donation.findUniqueOrThrow({ where: { id: donation.id } })).accountId,
    ).toBeNull();
  });

  it("refuses a number that is not a number at all", async () => {
    const donation = await aDonation();
    expect((await PATCH(...editing(donation.id, { accountId: "nonsense" }))).status).toBe(400);
  });

  it("refuses a closed number the record was not already pointing at", async () => {
    const donation = await aDonation();
    const account = await accountOn(METHOD);
    await prisma.paymentAccount.update({
      where: { id: account.id },
      data: { closedAt: new Date(), active: false },
    });

    expect((await PATCH(...editing(donation.id, { accountId: account.id }))).status).toBe(400);
  });

  it("lets a record keep the closed number it already points at", async () => {
    const donation = await aDonation();
    const account = await accountOn(METHOD);
    await PATCH(...editing(donation.id, { accountId: account.id }));
    await prisma.paymentAccount.update({
      where: { id: account.id },
      data: { closedAt: new Date(), active: false },
    });

    const res = await PATCH(...editing(donation.id, { accountId: account.id, amount: 7000 }));

    expect(res.status).toBe(200);
    expect(
      (await prisma.donation.findUniqueOrThrow({ where: { id: donation.id } })).accountId,
    ).toBe(account.id);
  });

  it("follows the method when both change together", async () => {
    const donation = await aDonation();
    const elsewhere = await accountOn(OTHER);

    const res = await PATCH(
      ...editing(donation.id, { paymentMethod: OTHER, accountId: elsewhere.id }),
    );

    expect(res.status).toBe(200);
    expect(
      (await prisma.donation.findUniqueOrThrow({ where: { id: donation.id } })).accountId,
    ).toBe(elsewhere.id);
  });
});

describe("recording which number money entered by hand landed in", () => {
  beforeEach(async () => {
    await resetDb();
    await signInAsAdmin(await createAdmin());
  });

  it("keeps the number on a donation an admin entered", async () => {
    const account = await accountOn(METHOD);
    const res = await CREATE_DONATION(
      post("/api/admin/donations", {
        donorName: "أبوبكر",
        amount: 4000,
        paymentMethod: METHOD,
        accountId: account.id,
      }),
    );

    expect(res.status).toBe(201);
    const donation = await prisma.donation.findFirstOrThrow();
    expect(donation.accountId).toBe(account.id);
  });

  it("takes one entered with no number at all", async () => {
    const res = await CREATE_DONATION(
      post("/api/admin/donations", { donorName: "أبوبكر", amount: 4000, paymentMethod: METHOD }),
    );

    expect(res.status).toBe(201);
    expect((await prisma.donation.findFirstOrThrow()).accountId).toBeNull();
  });

  it("refuses one whose number belongs to another method", async () => {
    const elsewhere = await accountOn(OTHER);
    const res = await CREATE_DONATION(
      post("/api/admin/donations", {
        donorName: "أبوبكر",
        amount: 4000,
        paymentMethod: METHOD,
        accountId: elsewhere.id,
      }),
    );

    expect(res.status).toBe(400);
    expect(await prisma.donation.count()).toBe(0);
  });

  it("keeps the number on a membership an admin entered", async () => {
    const person = await createUser("22990011");
    const account = await accountOn(METHOD);

    const res = await CREATE_MEMBERSHIP(
      post(`/api/admin/people/${person.id}/membership`, {
        paymentMethod: METHOD,
        accountId: account.id,
        paidAmount: 100,
        status: "ACTIVE",
      }),
      withId(person.id),
    );

    expect(res.status).toBe(201);
    const membership = await prisma.membership.findFirstOrThrow({ where: { userId: person.id } });
    expect(membership.accountId).toBe(account.id);
    const payment = await prisma.payment.findFirstOrThrow({ where: { userId: person.id } });
    expect(payment.accountId).toBe(account.id);
  });

  it("refuses a membership whose number belongs to another method", async () => {
    const person = await createUser("22990022");
    const elsewhere = await accountOn(OTHER);

    const res = await CREATE_MEMBERSHIP(
      post(`/api/admin/people/${person.id}/membership`, {
        paymentMethod: METHOD,
        accountId: elsewhere.id,
        paidAmount: 100,
        status: "ACTIVE",
      }),
      withId(person.id),
    );

    expect(res.status).toBe(400);
    expect(await prisma.membership.count()).toBe(0);
  });
});

describe("recording which number an expense was paid from", () => {
  beforeEach(async () => {
    await resetDb();
    await signInAsAdmin(await createAdmin());
  });

  it("keeps the number on a new expense", async () => {
    const account = await accountOn(METHOD);
    const res = await CREATE_EXPENSE(
      post("/api/admin/expenses", {
        label: "إيجار الملعب",
        amount: 1200,
        method: METHOD,
        accountId: account.id,
      }),
    );

    expect(res.status).toBe(201);
    expect((await prisma.expense.findFirstOrThrow()).accountId).toBe(account.id);
  });

  it("takes one paid in person, with no number at all", async () => {
    const res = await CREATE_EXPENSE(
      post("/api/admin/expenses", { label: "كرات", amount: 500, method: "نقداً" }),
    );

    expect(res.status).toBe(201);
    expect((await prisma.expense.findFirstOrThrow()).accountId).toBeNull();
  });

  it("refuses one whose number belongs to another method", async () => {
    const elsewhere = await accountOn(OTHER);
    const res = await CREATE_EXPENSE(
      post("/api/admin/expenses", {
        label: "كرات",
        amount: 500,
        method: METHOD,
        accountId: elsewhere.id,
      }),
    );

    expect(res.status).toBe(400);
    expect(await prisma.expense.count()).toBe(0);
  });

  it("records the number on an expense already saved", async () => {
    const account = await accountOn(METHOD);
    const expense = await prisma.expense.create({
      data: { label: "كرات", amount: 500, method: METHOD, createdBy: "admin" },
    });

    const res = await EDIT_EXPENSE(
      patch(`/api/admin/expenses/${expense.id}`, { accountId: account.id }),
      withId(expense.id),
    );

    expect(res.status).toBe(200);
    expect((await prisma.expense.findUniqueOrThrow({ where: { id: expense.id } })).accountId).toBe(
      account.id,
    );
  });
});
