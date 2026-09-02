import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { OWNER_ROLE, SUPER_ROLE } from "@/lib/adminRoles";
import { MEMBERSHIP_FEE } from "@/lib/donations";
import { money } from "@/lib/messages";
import { resetDb, get, createUser, createAdmin, signInAsAdmin, makeMember } from "./helpers";

import { GET as RECEIPTS } from "@/app/api/admin/receipts/route";
import { receiptByToken } from "@/lib/officialReceiptServer";
import { ensureReceiptsFor } from "@/lib/paymentReceiptServer";

const GIVER = "الكريم ولد الساتر";

async function marked() {
  const user = await createUser("44001122");
  return prisma.user.update({
    where: { id: user.id },
    data: { fullName: GIVER, supportNameConfidential: true },
  });
}

async function supportOf(userId: string, donorName = GIVER, amount = 5000) {
  const payment = await prisma.payment.create({
    data: { purpose: "DONATION", amount, method: "بنكيلي", status: "ACTIVE", userId, donorName },
  });
  await ensureReceiptsFor(prisma, { id: payment.id });
  return payment;
}

async function membershipOf(userId: string, paidAmount: number) {
  await makeMember({ userId, status: "ACTIVE", paymentMethod: "بنكيلي", paidAmount });
  await ensureReceiptsFor(prisma, { userId, purpose: "MEMBERSHIP" });
}

const listed = async () => (await (await RECEIPTS(get("/api/admin/receipts"))).json()).receipts;

describe("the receipts list and a confidential supporter", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("does not name him on his support receipt", async () => {
    const giver = await marked();
    await supportOf(giver.id);
    await signInAsAdmin(await createAdmin("boss", SUPER_ROLE));

    const rows = await listed();

    expect(rows).toHaveLength(1);
    expect(rows[0].payerName).toBe(money.anonymousDonor);
  });

  it("keeps the number, the amount and the date on the row", async () => {
    const giver = await marked();
    await supportOf(giver.id);
    await signInAsAdmin(await createAdmin("boss", SUPER_ROLE));

    const [row] = await listed();

    expect(row.amount).toBe(5000);
    expect(row.number).toMatch(/^R-/);
    expect(row.issuedOn).toBeTruthy();
  });

  it("withholds the verify token, which would have shown the name", async () => {
    const giver = await marked();
    await supportOf(giver.id);
    await signInAsAdmin(await createAdmin("boss", SUPER_ROLE));

    const [row] = await listed();

    expect("token" in row).toBe(false);
  });

  it("names him on the list for the role that holds the promise", async () => {
    const giver = await marked();
    await supportOf(giver.id);
    await signInAsAdmin(await createAdmin("owner", OWNER_ROLE));

    const [row] = await listed();

    expect(row.payerName).toBe(GIVER);
    expect(row.token).toBeTruthy();
  });

  it("leaves his own receipt correct at its token, which is his proof of payment", async () => {
    const giver = await marked();
    await supportOf(giver.id);
    const stored = await prisma.receipt.findFirstOrThrow();

    expect(stored.payerName).toBe(GIVER);

    const shown = await receiptByToken(stored.token);

    expect(shown?.payerName).toBe(GIVER);
    expect(shown?.token).toBe(stored.token);
  });

  it("names him on a membership receipt that stops at the fee", async () => {
    const giver = await marked();
    await membershipOf(giver.id, MEMBERSHIP_FEE);
    await signInAsAdmin(await createAdmin("boss", SUPER_ROLE));

    const [row] = await listed();

    expect(row.payerName).toBe(GIVER);
  });

  it("does not name him on a membership receipt carrying a surplus", async () => {
    const giver = await marked();
    await membershipOf(giver.id, MEMBERSHIP_FEE + 4900);
    await signInAsAdmin(await createAdmin("boss", SUPER_ROLE));

    const [row] = await listed();

    expect(row.payerName).toBe(money.anonymousDonor);
    expect(row.amount).toBe(MEMBERSHIP_FEE + 4900);
  });

  it("leaves the receipt of a giver who is not marked exactly as it was", async () => {
    const plain = await createUser("44003344");
    await prisma.user.update({ where: { id: plain.id }, data: { fullName: "عادي ولد عادي" } });
    await supportOf(plain.id, "عادي ولد عادي", 3000);
    await signInAsAdmin(await createAdmin("boss", SUPER_ROLE));

    const [row] = await listed();

    expect(row.payerName).toBe("عادي ولد عادي");
    expect(row.token).toBeTruthy();
  });
});
