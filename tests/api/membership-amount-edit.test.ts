import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { saveAppSettings } from "@/lib/settingsServer";
import { runningYear } from "@/lib/membershipYear";
import { resetDb, patch, put, createAdmin, signInAsAdmin, withId, makeMember } from "./helpers";

import { PATCH as UPDATE } from "@/app/api/admin/members/[id]/route";
import { PUT as PAY } from "@/app/api/admin/members/[id]/payment/route";
import { syncReceiptsFor } from "@/lib/paymentReceiptServer";

const YEAR = runningYear();

async function memberMissingAmount() {
  const m = await makeMember({
    fullName: "محمد ولد أحمد",
    age: "البدريين",
    paymentMethod: "بنكيلي",
    status: "ACTIVE",
    paidAmount: null,
    membershipYear: YEAR,
    memberNumber: "AJVT-2026-0001",
  });
  return m;
}

const paidFor = (memberId: string) =>
  prisma.payment.findFirst({
    where: { userId: memberId, purpose: "MEMBERSHIP", year: YEAR },
  });

describe("entering an amount that was never recorded", () => {
  beforeEach(async () => {
    await resetDb();
    await saveAppSettings({ membershipYear: YEAR, membershipFee: 100 });
    await signInAsAdmin(await createAdmin());
  });

  it("writes the amount onto the year it belongs to", async () => {
    const m = await memberMissingAmount();

    const res = await PAY(
      put(`/api/admin/members/${m.userId}/payment`, { amountTransferred: 100 }),
      withId(m.userId),
    );
    expect(res.status).toBe(200);

    const payment = await paidFor(m.id);
    expect(payment?.amount).toBe(100);
    expect(payment?.feeApplied).toBe(100);
  });

  it("turns an amount above the fee into support for that member", async () => {
    const m = await memberMissingAmount();

    await PAY(
      put(`/api/admin/members/${m.userId}/payment`, { amountTransferred: 300 }),
      withId(m.userId),
    );

    const payment = await paidFor(m.id);
    expect(payment?.amount).toBe(300);
    expect((payment?.amount ?? 0) - (payment?.feeApplied ?? 0)).toBe(200);
  });

  it("counts only the fee as the fee once the surplus is split out", async () => {
    const m = await memberMissingAmount();

    await PAY(
      put(`/api/admin/members/${m.userId}/payment`, { amountTransferred: 300 }),
      withId(m.userId),
    );

    const payment = await paidFor(m.id);
    expect(Math.min(payment?.amount ?? 0, payment?.feeApplied ?? 0)).toBe(100);
  });

  it("leaves the year alone when the edit does not touch the payment", async () => {
    const m = await memberMissingAmount();
    await PAY(
      put(`/api/admin/members/${m.userId}/payment`, { amountTransferred: 100 }),
      withId(m.userId),
    );

    await UPDATE(
      patch(`/api/admin/members/${m.userId}`, { fullName: "أحمد ولد محمد" }),
      withId(m.userId),
    );

    expect((await paidFor(m.id))?.amount).toBe(100);
  });
});

describe("correcting a membership payment where it lives", () => {
  beforeEach(async () => {
    await resetDb();
    await saveAppSettings({ membershipYear: YEAR, membershipFee: 100 });
    await signInAsAdmin(await createAdmin());
  });

  async function paid() {
    return makeMember({
      fullName: "محمد ولد أحمد",
      age: "البدريين",
      paymentMethod: "بنكيلي",
      status: "ACTIVE",
      paidAmount: 200,
      membershipYear: YEAR,
    });
  }

  it("writes the day the money was paid", async () => {
    const m = await paid();

    const res = await PAY(
      put(`/api/admin/members/${m.userId}/payment`, { paidOn: "2026-08-18" }),
      withId(m.userId),
    );

    expect(res.status).toBe(200);
    const row = await paidFor(m.userId);
    expect(row?.paidOn?.toISOString().slice(0, 10)).toBe("2026-08-18");
  });

  it("writes the bank reference", async () => {
    const m = await paid();

    await PAY(
      put(`/api/admin/members/${m.userId}/payment`, { bankReference: "REF-42" }),
      withId(m.userId),
    );

    expect((await paidFor(m.userId))?.bankReference).toBe("REF-42");
  });

  it("clears the bank reference when it is sent empty", async () => {
    const m = await paid();
    await PAY(
      put(`/api/admin/members/${m.userId}/payment`, { bankReference: "REF-42" }),
      withId(m.userId),
    );

    await PAY(
      put(`/api/admin/members/${m.userId}/payment`, { bankReference: null }),
      withId(m.userId),
    );

    expect((await paidFor(m.userId))?.bankReference).toBeNull();
  });

  it("keeps the reference and the day when the edit does not name them", async () => {
    const m = await paid();
    await PAY(
      put(`/api/admin/members/${m.userId}/payment`, {
        bankReference: "REF-42",
        paidOn: "2026-08-18",
      }),
      withId(m.userId),
    );

    await PAY(
      put(`/api/admin/members/${m.userId}/payment`, { amountTransferred: 500 }),
      withId(m.userId),
    );

    const row = await paidFor(m.userId);
    expect(row?.amount).toBe(500);
    expect(row?.bankReference).toBe("REF-42");
    expect(row?.paidOn?.toISOString().slice(0, 10)).toBe("2026-08-18");
  });

  it("refuses an amount sent as nothing at all", async () => {
    const m = await paid();

    const res = await PAY(
      put(`/api/admin/members/${m.userId}/payment`, { amountTransferred: null }),
      withId(m.userId),
    );

    expect(res.status).toBe(400);
    expect((await paidFor(m.userId))?.amount).toBe(200);
  });

  it("keeps the receipt behind a payment it was asked to empty", async () => {
    const m = await paid();
    await syncReceiptsFor(prisma, { userId: m.userId });
    const before = await prisma.receipt.findFirstOrThrow({ where: { status: "ACTIVE" } });

    await PAY(
      put(`/api/admin/members/${m.userId}/payment`, { amountTransferred: null }),
      withId(m.userId),
    );

    const after = await prisma.receipt.findFirstOrThrow({ where: { id: before.id } });
    expect(after.status).toBe("ACTIVE");
  });

  it("measures the amount against the fee the payment carries, not today's", async () => {
    const m = await paid();
    await saveAppSettings({ membershipYear: YEAR, membershipFee: 500 });

    const res = await PAY(
      put(`/api/admin/members/${m.userId}/payment`, { amountTransferred: 150 }),
      withId(m.userId),
    );

    expect(res.status).toBe(200);
    const row = await paidFor(m.userId);
    expect(row?.amount).toBe(150);
    expect(row?.feeApplied).toBe(100);
  });

  it("still refuses an amount below the fee the payment carries", async () => {
    const m = await paid();
    await saveAppSettings({ membershipYear: YEAR, membershipFee: 500 });

    const res = await PAY(
      put(`/api/admin/members/${m.userId}/payment`, { amountTransferred: 40 }),
      withId(m.userId),
    );

    expect(res.status).toBe(400);
    expect((await paidFor(m.userId))?.amount).toBe(200);
  });

  it("takes the fee from the settings where the membership has no payment yet", async () => {
    const m = await memberMissingAmount();
    await saveAppSettings({ membershipYear: YEAR, membershipFee: 300 });

    const refused = await PAY(
      put(`/api/admin/members/${m.userId}/payment`, { amountTransferred: 100 }),
      withId(m.userId),
    );
    expect(refused.status).toBe(400);

    await PAY(
      put(`/api/admin/members/${m.userId}/payment`, { amountTransferred: 300 }),
      withId(m.userId),
    );
    expect((await paidFor(m.userId))?.feeApplied).toBe(300);
  });

  it("keeps the receipt in step with the corrected amount", async () => {
    const m = await paid();
    await syncReceiptsFor(prisma, { userId: m.userId });

    await PAY(
      put(`/api/admin/members/${m.userId}/payment`, { amountTransferred: 500 }),
      withId(m.userId),
    );

    const row = await paidFor(m.userId);
    const receipt = await prisma.receipt.findFirstOrThrow({
      where: { paymentId: row!.id, status: "ACTIVE" },
    });
    expect(receipt.amount).toBe(500);
  });
});
