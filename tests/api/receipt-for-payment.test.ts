import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { resetDb, post, createAdmin, signInAsAdmin } from "./helpers";
import { POST as ADMIN_DONATION } from "@/app/api/admin/donations/route";
import { ensureReceiptsFor } from "@/lib/paymentReceiptServer";
import { money } from "@/lib/messages";

async function donate(body: Record<string, unknown>) {
  return ADMIN_DONATION(post("/api/admin/donations", body));
}

describe("a receipt follows every accepted payment", () => {
  beforeEach(async () => {
    await resetDb();
    await signInAsAdmin(await createAdmin("boss", "SUPER"));
  });

  it("issues one, numbered and tokened, when an admin records a donation", async () => {
    await donate({ donorName: "أحمد سالم", amount: 5000, paymentMethod: "بنكيلي" });

    const receipts = await prisma.receipt.findMany();
    expect(receipts).toHaveLength(1);
    expect(receipts[0].number).toMatch(/^R-\d{4}-\d{4}$/);
    expect(receipts[0].token).toHaveLength(32);
    expect(receipts[0].amount).toBe(5000);
    expect(receipts[0].payerName).toBe("أحمد سالم");
    expect(receipts[0].reason).toBe("تبرع");
  });

  it("ties it to the payment it came from", async () => {
    await donate({ donorName: "أحمد سالم", amount: 5000, paymentMethod: "بنكيلي" });

    const payment = await prisma.payment.findFirstOrThrow();
    const receipt = await prisma.receipt.findFirstOrThrow();
    expect(receipt.paymentId).toBe(payment.id);
  });

  it("has nothing to name when a giver left no name at all", async () => {
    await prisma.payment.create({
      data: { purpose: "DONATION", amount: 2000, status: "ACTIVE", anonymous: true },
    });

    await ensureReceiptsFor(prisma, {});

    const receipt = await prisma.receipt.findFirstOrThrow();
    expect(receipt.payerName).toBe(money.anonymousDonor);
  });

  it("numbers two donations in the order they were taken", async () => {
    await donate({ donorName: "الأول", amount: 1000, paymentMethod: "بنكيلي" });
    await donate({ donorName: "الثاني", amount: 2000, paymentMethod: "بنكيلي" });

    const receipts = await prisma.receipt.findMany({ orderBy: { number: "asc" } });
    expect(receipts.map((r) => r.payerName)).toEqual(["الأول", "الثاني"]);
  });

  it("never issues a second receipt for the same payment", async () => {
    await donate({ donorName: "أحمد سالم", amount: 5000, paymentMethod: "بنكيلي" });
    const first = await prisma.receipt.findFirstOrThrow();

    const payment = await prisma.payment.findFirstOrThrow();
    await ensureReceiptsFor(prisma, { id: payment.id });
    await ensureReceiptsFor(prisma, {});

    const receipts = await prisma.receipt.findMany();
    expect(receipts).toHaveLength(1);
    expect(receipts[0].number).toBe(first.number);
  });

  it("leaves a payment still awaiting review without one", async () => {
    await prisma.payment.create({
      data: { purpose: "DONATION", amount: 500, status: "PENDING", donorName: "لاحقاً" },
    });

    await ensureReceiptsFor(prisma, {});

    expect(await prisma.receipt.count()).toBe(0);
  });

  it("backfills every accepted payment that predates the receipt book", async () => {
    for (const [name, amount] of [
      ["الأول", 1000],
      ["الثاني", 2000],
      ["الثالث", 3000],
    ] as const) {
      await prisma.payment.create({
        data: { purpose: "DONATION", amount, status: "ACTIVE", donorName: name },
      });
    }
    expect(await prisma.receipt.count()).toBe(0);

    const issued = await ensureReceiptsFor(prisma, {});

    expect(issued).toHaveLength(3);
    expect(new Set(issued.map((r) => r.number)).size).toBe(3);
  });
});
