import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { getFinanceSummary } from "@/lib/financeServer";
import { recordMembershipPayment } from "@/lib/membershipPaymentServer";
import { mirrorDonation } from "@/lib/paymentMirror";
import { resetDb } from "./helpers";

const ANON = "فاعل خير";

async function member(fullName: string, status: "ACTIVE" | "PENDING" = "ACTIVE") {
  return prisma.member.create({
    data: { fullName, age: "البدريين", paymentMethod: "بنكيلي", status },
  });
}

async function gift(amount: number, opts: { name?: string | null; method?: string | null } = {}) {
  const donation = await prisma.donation.create({
    data: {
      amount,
      donorName: opts.name ?? null,
      paymentMethod: opts.method ?? null,
      status: "ACTIVE",
    },
  });
  await mirrorDonation(prisma, {
    donationId: donation.id,
    amount,
    method: opts.method ?? null,
    proof: null,
    status: "ACTIVE",
    donorName: donation.donorName,
    donorPhoto: null,
    donorPhone: null,
    memberId: null,
    activityId: null,
  });
  return donation;
}

describe("the finance summary", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("splits one membership payment into the fee it covered and the support it carried", async () => {
    const m = await member("محمد");
    await recordMembershipPayment(prisma, m.id, 1000, 100);

    const summary = await getFinanceSummary();

    expect(summary.totalRevenue).toBe(1000);
    expect(summary.byMethod["بنكيلي"]).toBe(1000);
    expect(summary.byMethodDetail["بنكيلي"].intisab).toEqual([{ name: "محمد", amount: 100 }]);
    expect(summary.byMethodDetail["بنكيلي"].daem).toEqual([{ name: "محمد", amount: 900 }]);
  });

  it("puts both halves on the day the payment was taken", async () => {
    const m = await member("محمد");
    await recordMembershipPayment(prisma, m.id, 1000, 100);

    const summary = await getFinanceSummary();

    expect(summary.days).toHaveLength(1);
    expect(summary.days[0].total).toBe(1000);
    expect(summary.days[0].records.map((r) => [r.kind, r.amount])).toEqual(
      expect.arrayContaining([
        ["انتساب", 100],
        ["دعم", 900],
      ]),
    );
  });

  it("counts a member who paid the fee alone as membership and nothing else", async () => {
    const m = await member("محمد");
    await recordMembershipPayment(prisma, m.id, 100, 100);

    const summary = await getFinanceSummary();

    expect(summary.totalRevenue).toBe(100);
    expect(summary.byMethodDetail["بنكيلي"].daem).toEqual([]);
  });

  it("leaves out a payment still awaiting review", async () => {
    const m = await member("محمد", "PENDING");
    await recordMembershipPayment(prisma, m.id, 1000, 100);

    expect((await getFinanceSummary()).totalRevenue).toBe(0);
  });

  it("keeps an anonymous gift out of the named list but inside the total", async () => {
    await gift(500, { method: "السداد" });

    const summary = await getFinanceSummary();

    expect(summary.totalRevenue).toBe(500);
    expect(summary.byMethodDetail["السداد"].anonymousTotal).toBe(500);
    expect(summary.byMethodDetail["السداد"].daem).toEqual([]);
  });

  it("lists a gift with no method by its donation id, which is what assigns one", async () => {
    const donation = await gift(500, { name: "زائر" });

    const summary = await getFinanceSummary();

    expect(summary.unassigned).toEqual([{ id: donation.id, name: "زائر", amount: 500 }]);
  });

  it("names an unnamed giver on the day list the way the board does", async () => {
    await gift(500, { method: "السداد" });

    const summary = await getFinanceSummary();

    expect(summary.allRecords[0].name).toBe(ANON);
  });
});
