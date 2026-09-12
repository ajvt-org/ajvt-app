import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { resetDb, post, createAdmin, signInAsAdmin } from "./helpers";
import { POST as ADMIN_DONATION } from "@/app/api/admin/donations/route";
import { ensureReceiptsFor } from "@/lib/paymentReceiptServer";

const YEAR = new Date().getFullYear();

const counterValue = async () => {
  const row = await prisma.counter.findUnique({ where: { id: `receipt:${YEAR}` } });
  return row?.value ?? 0;
};

async function detachedReceipt(number: string) {
  await prisma.receipt.create({
    data: {
      number,
      token: `t-${number}`,
      payerName: "مجهول",
      reason: "تبرع",
      amount: 1,
      issuedOn: new Date(),
      issuedBy: "system",
      status: "VOID",
      paymentId: null,
    },
  });
}

async function activeDonation(amount: number) {
  return prisma.payment.create({
    data: { purpose: "DONATION", amount, status: "ACTIVE", anonymous: true },
  });
}

describe("a receipt number leaving the sequence", () => {
  beforeEach(async () => {
    await resetDb();
    await signInAsAdmin(await createAdmin("boss", "SUPER"));
  });

  it("goes back when the write it belongs to rolls back", async () => {
    await activeDonation(1000);

    await expect(
      prisma.$transaction(async (tx) => {
        await ensureReceiptsFor(tx, {});
        throw new Error("rolled back");
      }),
    ).rejects.toThrow("rolled back");

    expect(await counterValue()).toBe(0);
    expect(await prisma.receipt.count()).toBe(0);
  });

  it("keeps none of the numbers a part written pass took", async () => {
    await activeDonation(1000);
    await activeDonation(2000);
    await activeDonation(3000);

    await expect(
      prisma.$transaction(async (tx) => {
        await ensureReceiptsFor(tx, {});
        throw new Error("rolled back");
      }),
    ).rejects.toThrow("rolled back");

    expect(await counterValue()).toBe(0);
  });

  it("stays spent once the receipt carrying it is committed", async () => {
    await activeDonation(1000);

    await prisma.$transaction((tx) => ensureReceiptsFor(tx, {}));

    expect(await counterValue()).toBe(1);
    expect(await prisma.receipt.count()).toBe(1);
  });

  it("goes back when a donation an admin records cannot carry it", async () => {
    await detachedReceipt(`R-${YEAR}-0001`);

    const refused = await ADMIN_DONATION(
      post("/api/admin/donations", { donorName: "أحمد", amount: 1000, paymentMethod: "بنكيلي" }),
    );

    expect(refused.status).toBeGreaterThanOrEqual(400);
    expect(await counterValue()).toBe(0);
  });

  it("leaves the sequence unbroken across the donations an admin records", async () => {
    await ADMIN_DONATION(
      post("/api/admin/donations", { donorName: "الأول", amount: 1000, paymentMethod: "بنكيلي" }),
    );
    await ADMIN_DONATION(
      post("/api/admin/donations", { donorName: "الثاني", amount: 2000, paymentMethod: "بنكيلي" }),
    );

    const receipts = await prisma.receipt.findMany({ orderBy: { number: "asc" } });

    expect(receipts).toHaveLength(await counterValue());
    expect(receipts.map((r) => r.number)).toEqual([`R-${YEAR}-0001`, `R-${YEAR}-0002`]);
  });
});
