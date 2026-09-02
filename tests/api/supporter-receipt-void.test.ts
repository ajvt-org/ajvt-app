import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { OWNER_ROLE, SUPER_ROLE } from "@/lib/adminRoles";
import { MEMBERSHIP_FEE } from "@/lib/donations";
import { ensureReceiptsFor } from "@/lib/paymentReceiptServer";
import {
  resetDb,
  post,
  createUser,
  createAdmin,
  signInAsAdmin,
  withParams,
  makeMember,
} from "./helpers";

import { POST as VOID } from "@/app/api/admin/receipts/[number]/void/route";

const GIVER = "الكريم ولد الساتر";

async function marked(confidential = true) {
  const user = await createUser("44001122");
  return prisma.user.update({
    where: { id: user.id },
    data: { fullName: GIVER, supportNameConfidential: confidential },
  });
}

async function supportReceiptOf(userId: string) {
  const payment = await prisma.payment.create({
    data: {
      purpose: "DONATION",
      amount: 5000,
      method: "بنكيلي",
      status: "ACTIVE",
      userId,
      donorName: GIVER,
    },
  });
  await ensureReceiptsFor(prisma, { id: payment.id });
  return prisma.receipt.findFirstOrThrow({ where: { paymentId: payment.id } });
}

function voidIt(number: string) {
  return VOID(
    post(`/api/admin/receipts/${number}/void`, { reason: "خطأ في المبلغ" }),
    withParams({ number }),
  );
}

const asOrdinary = async () => signInAsAdmin(await createAdmin("boss", SUPER_ROLE));
const asNarrow = async () => signInAsAdmin(await createAdmin("nurse", "MEMBERS"));
const asOwner = async () => signInAsAdmin(await createAdmin("owner", OWNER_ROLE));

describe("voiding the receipt of a confidential supporter", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("is refused to a full access admin", async () => {
    const giver = await marked();
    const receipt = await supportReceiptOf(giver.id);
    await asOrdinary();

    expect((await voidIt(receipt.number)).status).toBe(403);
  });

  it("is refused to a narrower admin", async () => {
    const giver = await marked();
    const receipt = await supportReceiptOf(giver.id);
    await asNarrow();

    expect((await voidIt(receipt.number)).status).toBe(403);
  });

  it("leaves the receipt standing when it is refused", async () => {
    const giver = await marked();
    const receipt = await supportReceiptOf(giver.id);
    await asOrdinary();

    await voidIt(receipt.number);

    const after = await prisma.receipt.findUniqueOrThrow({ where: { number: receipt.number } });
    expect(after.status).toBe("ACTIVE");
    expect(after.voidedBy).toBeNull();
  });

  it("names him nowhere in the refusal", async () => {
    const giver = await marked();
    const receipt = await supportReceiptOf(giver.id);
    await asOrdinary();

    const body = await (await voidIt(receipt.number)).text();

    expect(body).not.toContain(GIVER);
    expect(body).not.toContain(receipt.token);
  });

  it("is allowed to the role that holds the promise", async () => {
    const giver = await marked();
    const receipt = await supportReceiptOf(giver.id);
    await asOwner();

    expect((await voidIt(receipt.number)).status).toBe(200);
    const after = await prisma.receipt.findUniqueOrThrow({ where: { number: receipt.number } });
    expect(after.status).toBe("VOID");
  });

  it("is refused on a membership receipt carrying a surplus", async () => {
    const giver = await marked();
    await makeMember({
      userId: giver.id,
      status: "ACTIVE",
      paymentMethod: "بنكيلي",
      paidAmount: MEMBERSHIP_FEE + 4900,
    });
    await ensureReceiptsFor(prisma, { userId: giver.id, purpose: "MEMBERSHIP" });
    const receipt = await prisma.receipt.findFirstOrThrow();
    await asOrdinary();

    expect((await voidIt(receipt.number)).status).toBe(403);
  });

  it("is allowed on a membership receipt that stops at the fee", async () => {
    const giver = await marked();
    await makeMember({
      userId: giver.id,
      status: "ACTIVE",
      paymentMethod: "بنكيلي",
      paidAmount: MEMBERSHIP_FEE,
    });
    await ensureReceiptsFor(prisma, { userId: giver.id, purpose: "MEMBERSHIP" });
    const receipt = await prisma.receipt.findFirstOrThrow();
    await asOrdinary();

    expect((await voidIt(receipt.number)).status).toBe(200);
  });

  it("is allowed on the receipt of a giver who is not marked", async () => {
    const giver = await marked(false);
    const receipt = await supportReceiptOf(giver.id);
    await asOrdinary();

    const response = await voidIt(receipt.number);
    const body = await response.text();

    expect(response.status).toBe(200);
    expect(body).toContain(GIVER);
  });

  it("says nothing about a receipt that is not there", async () => {
    await asOrdinary();

    expect((await voidIt("R-2026-9999")).status).toBe(404);
  });
});
