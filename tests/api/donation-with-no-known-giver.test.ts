import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { money } from "@/lib/messages";
import { resetDb, post, createAdmin, signInAsAdmin } from "./helpers";

import { POST as RECORD } from "@/app/api/admin/donations/route";

function record(body: Record<string, unknown>) {
  return RECORD(post("/api/admin/donations", body));
}

describe("recording money whose giver the association cannot identify", () => {
  beforeEach(async () => {
    await resetDb();
    await signInAsAdmin(await createAdmin());
  });

  it("takes an amount with no name at all", async () => {
    const res = await record({ amount: 500, paymentMethod: "بنكيلي" });

    expect(res.status).toBe(201);
    const donation = await prisma.donation.findFirstOrThrow();
    expect(donation.amount).toBe(500);
    expect(donation.donorName).toBeNull();
  });

  it("reads back as the display constant, which is what a null name has always meant", async () => {
    const res = await record({ amount: 500, paymentMethod: "بنكيلي" });

    const { donation } = await res.json();
    expect(donation.memberName).toBe(money.anonymousDonor);
  });

  it("refuses the display constant typed in as a name", async () => {
    const res = await record({
      amount: 500,
      paymentMethod: "بنكيلي",
      donorName: money.anonymousDonor,
    });

    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe(money.nameIsThePlaceholder);
    expect(await prisma.donation.count()).toBe(0);
  });

  it("names the giver on the record when the admin knows who they are", async () => {
    await record({ amount: 500, paymentMethod: "بنكيلي", donorName: "خالد الأمين" });

    expect((await prisma.donation.findFirstOrThrow()).donorName).toBe("خالد الأمين");
  });

  it("mirrors an unnamed donation onto the payment beside it", async () => {
    await record({ amount: 500, paymentMethod: "بنكيلي" });

    const payment = await prisma.payment.findFirstOrThrow({ where: { purpose: "DONATION" } });
    expect(payment.donorName).toBeNull();
    expect(payment.amount).toBe(500);
  });
});
