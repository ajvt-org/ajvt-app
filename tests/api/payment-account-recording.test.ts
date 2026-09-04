import { describe, it, expect, beforeEach } from "vitest";
import { PATCH } from "@/app/api/admin/donations/[id]/route";
import { prisma } from "@/lib/prisma";
import { resetDb, patch, withId, createAdmin, signInAsAdmin } from "./helpers";

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
