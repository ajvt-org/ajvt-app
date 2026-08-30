import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { resetDb, createUsers, makeMember } from "./helpers";
import { ensureReceiptsFor, syncReceiptsFor } from "@/lib/paymentReceiptServer";
import { money, receipts as receiptMessages } from "@/lib/messages";

async function aGift(amount: number, over: Record<string, unknown> = {}) {
  const payment = await prisma.payment.create({
    data: { purpose: "DONATION", amount, status: "ACTIVE", donorName: "ابو", ...over },
  });
  await ensureReceiptsFor(prisma, { id: payment.id });
  return payment;
}

async function anAccount(fullName: string) {
  const [user] = await createUsers(1);
  await makeMember({
    userId: user.id,
    fullName,
    age: "البدريين",
    paymentMethod: "بنكيلي",
    status: "ACTIVE",
  });
  return { userId: user.id };
}

describe("a receipt follows the payment it was issued for", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("voids the old number and issues a new one when the amount is corrected", async () => {
    const payment = await aGift(100);
    const first = await prisma.receipt.findFirstOrThrow();

    await prisma.payment.update({ where: { id: payment.id }, data: { amount: 2000 } });
    await syncReceiptsFor(prisma, { id: payment.id });

    const [stale, replacement] = await prisma.receipt.findMany({ orderBy: { number: "asc" } });
    expect(stale.id).toBe(first.id);
    expect(stale.status).toBe("VOID");
    expect(stale.amount).toBe(100);
    expect(stale.paymentId).toBeNull();
    expect(replacement.status).toBe("ACTIVE");
    expect(replacement.amount).toBe(2000);
    expect(replacement.paymentId).toBe(payment.id);
    expect(replacement.number).not.toBe(stale.number);
  });

  it("says on the voided receipt which number replaced it", async () => {
    const payment = await aGift(100);

    await prisma.payment.update({ where: { id: payment.id }, data: { amount: 2000 } });
    await syncReceiptsFor(prisma, { id: payment.id });

    const stale = await prisma.receipt.findFirstOrThrow({ where: { status: "VOID" } });
    const replacement = await prisma.receipt.findFirstOrThrow({ where: { status: "ACTIVE" } });
    expect(stale.voidReason).toBe(receiptMessages.replacedAfterCorrection(replacement.number));
  });

  it("keeps the number when only the payer's name changed", async () => {
    const payment = await aGift(2000);
    const first = await prisma.receipt.findFirstOrThrow();

    await prisma.payment.update({ where: { id: payment.id }, data: { donorName: "أبوبكر" } });
    await syncReceiptsFor(prisma, { id: payment.id });

    const receipts = await prisma.receipt.findMany();
    expect(receipts).toHaveLength(1);
    expect(receipts[0].number).toBe(first.number);
    expect(receipts[0].status).toBe("ACTIVE");
    expect(receipts[0].payerName).toBe("أبوبكر");
  });

  it("takes the account's name once the payment is linked to one", async () => {
    const payment = await aGift(2000);
    const account = await anAccount("أبوبكر لمرابط");

    await prisma.payment.update({
      where: { id: payment.id },
      data: { userId: account.userId },
    });
    await syncReceiptsFor(prisma, { id: payment.id });

    const receipt = await prisma.receipt.findFirstOrThrow();
    expect(receipt.payerName).toBe("أبوبكر لمرابط");
    expect(receipt.userId).toBe(account.userId);
  });

  it("gives back the typed name when the account is unlinked again", async () => {
    const account = await anAccount("أبوبكر لمرابط");
    const payment = await aGift(2000, {
      userId: account.userId,
    });

    await prisma.payment.update({
      where: { id: payment.id },
      data: { userId: null },
    });
    await syncReceiptsFor(prisma, { id: payment.id });

    const receipt = await prisma.receipt.findFirstOrThrow();
    expect(receipt.payerName).toBe("ابو");
    expect(receipt.userId).toBeNull();
  });

  it("keeps naming the payer when the gift is hidden from the board", async () => {
    const payment = await aGift(2000);

    await prisma.payment.update({ where: { id: payment.id }, data: { anonymous: true } });
    await syncReceiptsFor(prisma, { id: payment.id });

    const receipt = await prisma.receipt.findFirstOrThrow();
    expect(receipt.payerName).toBe("ابو");
  });

  it("names the account on a hidden gift rather than the typed name", async () => {
    const account = await anAccount("أبوبكر لمرابط");
    const payment = await aGift(2000, { userId: account.userId, anonymous: true });

    await syncReceiptsFor(prisma, { id: payment.id });

    const receipt = await prisma.receipt.findFirstOrThrow();
    expect(receipt.payerName).toBe("أبوبكر لمرابط");
  });

  it("still has nothing to name when the giver left no name at all", async () => {
    const payment = await aGift(2000, { anonymous: true, donorName: null });

    await syncReceiptsFor(prisma, { id: payment.id });

    const receipt = await prisma.receipt.findFirstOrThrow();
    expect(receipt.payerName).toBe(money.anonymousDonor);
  });

  it("leaves a receipt that still agrees with its payment untouched", async () => {
    const payment = await aGift(2000);
    const before = await prisma.receipt.findFirstOrThrow();

    await syncReceiptsFor(prisma, { id: payment.id });

    const after = await prisma.receipt.findFirstOrThrow();
    expect(after).toEqual(before);
  });

  it("voids rather than corrects a receipt whose payment was refused", async () => {
    const payment = await aGift(2000);

    await prisma.payment.update({
      where: { id: payment.id },
      data: { status: "REJECTED", amount: 3000 },
    });
    await syncReceiptsFor(prisma, { id: payment.id });

    const receipts = await prisma.receipt.findMany();
    expect(receipts).toHaveLength(1);
    expect(receipts[0].status).toBe("VOID");
    expect(receipts[0].voidReason).toBe(receiptMessages.withdrawnOnRefusal);
  });
});
