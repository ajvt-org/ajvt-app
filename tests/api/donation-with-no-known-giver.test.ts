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
    const gift = await prisma.payment.findFirstOrThrow();
    expect(gift.amount).toBe(500);
    expect(gift.donorName).toBeNull();
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
    expect(await prisma.payment.count()).toBe(0);
  });

  it("names the giver on the record when the admin knows who they are", async () => {
    await record({ amount: 500, paymentMethod: "بنكيلي", donorName: "خالد الأمين" });

    expect((await prisma.payment.findFirstOrThrow()).donorName).toBe("خالد الأمين");
  });

  it("records the operation number and the anonymity the dialog now sends", async () => {
    await record({
      amount: 500,
      paymentMethod: "بنكيلي",
      donorName: "خالد الأمين",
      bankReference: "TR10000000001",
      anonymous: true,
    });

    const gift = await prisma.payment.findFirstOrThrow();
    expect(gift.bankReference).toBe("TR10000000001");
    expect(gift.anonymous).toBe(true);
    expect(gift.donorName).toBe("خالد الأمين");
  });

  it("publishes a new donation unless the dialog says otherwise", async () => {
    await record({ amount: 500, paymentMethod: "بنكيلي", donorName: "خالد الأمين" });

    const gift = await prisma.payment.findFirstOrThrow();
    expect(gift.anonymous).toBe(false);
    expect(gift.bankReference).toBeNull();
  });
});
