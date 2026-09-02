import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { OWNER_ROLE, SUPER_ROLE } from "@/lib/adminRoles";
import { ensureReceiptsFor } from "@/lib/paymentReceiptServer";
import { resetDb, get, createUser, createAdmin, signInAsAdmin } from "./helpers";

import { GET as RECEIPTS } from "@/app/api/admin/receipts/route";
import { GET as PAYMENT_PROOFS } from "@/app/api/admin/payment-proofs/route";

const GIVER = "الكريم ولد الساتر";

async function marked() {
  const user = await createUser("44001122");
  return prisma.user.update({
    where: { id: user.id },
    data: { fullName: GIVER, supportNameConfidential: true },
  });
}

async function supportOf(userId: string) {
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
  await prisma.donation.create({
    data: {
      id: payment.id,
      donorName: GIVER,
      amount: 5000,
      status: "ACTIVE",
      source: "SELF",
      paymentMethod: "بنكيلي",
      userId,
    },
  });
  await ensureReceiptsFor(prisma, { id: payment.id });
  return payment;
}

const asOrdinary = async () => signInAsAdmin(await createAdmin("boss", SUPER_ROLE));
const asOwner = async () => signInAsAdmin(await createAdmin("owner", OWNER_ROLE));

const listed = async () => (await (await RECEIPTS(get("/api/admin/receipts"))).json()).receipts;
const proofs = async () =>
  (await (await PAYMENT_PROOFS(get("/api/admin/payment-proofs"))).json()).proofs;

describe("the token that leads to a confidential supporter name", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("is absent from the receipts row rather than empty", async () => {
    const giver = await marked();
    await supportOf(giver.id);
    await asOrdinary();

    const [row] = await listed();

    expect("token" in row).toBe(false);
  });

  it("is absent from the receipt on the payments card", async () => {
    const giver = await marked();
    await supportOf(giver.id);
    await asOrdinary();

    const [row] = await proofs();

    expect(row.receipt).not.toBeNull();
    expect("token" in row.receipt).toBe(false);
  });

  it("keeps the receipt number and status on the payments card", async () => {
    const giver = await marked();
    await supportOf(giver.id);
    await asOrdinary();

    const [row] = await proofs();

    expect(row.receipt.number).toMatch(/^R-/);
    expect(row.receipt.status).toBe("ACTIVE");
  });

  it("is there for the role that holds the promise, on both", async () => {
    const giver = await marked();
    await supportOf(giver.id);
    await asOwner();

    const [receipt] = await listed();
    const [proof] = await proofs();

    expect(receipt.token).toBeTruthy();
    expect(proof.receipt.token).toBeTruthy();
  });

  it("is there for a giver who is not marked", async () => {
    const plain = await createUser("44003344");
    await prisma.user.update({ where: { id: plain.id }, data: { fullName: "عادي ولد عادي" } });
    await supportOf(plain.id);
    await asOrdinary();

    const [receipt] = await listed();
    const [proof] = await proofs();

    expect(receipt.token).toBeTruthy();
    expect(proof.receipt.token).toBeTruthy();
  });
});
