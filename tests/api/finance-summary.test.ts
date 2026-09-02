import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { SUPER_ROLE } from "@/lib/adminRoles";
import { getFinanceSummary } from "@/lib/financeServer";
import { recordMembershipPayment } from "@/lib/membershipPaymentServer";
import { donationMirrorOf, mirrorDonation } from "@/lib/paymentMirror";
import { resetDb, makeMember } from "./helpers";

const ANON = "فاعل خير";

async function member(fullName: string, status: "ACTIVE" | "PENDING" = "ACTIVE") {
  return makeMember({
    fullName,
    age: "البدريين",
    paymentMethod: "بنكيلي",
    status,
  });
}

async function gift(amount: number, opts: { name?: string | null; method?: string | null } = {}) {
  const donation = await prisma.donation.create({
    data: {
      amount,
      anonymous: opts.name == null,
      donorName: opts.name ?? null,
      paymentMethod: opts.method ?? null,
      status: "ACTIVE",
    },
  });
  await mirrorDonation(prisma, donationMirrorOf(donation));
  return donation;
}

const ADMIN = { role: SUPER_ROLE };

describe("the finance summary", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("splits one membership payment into the fee it covered and the support it carried", async () => {
    const m = await member("محمد");
    await recordMembershipPayment(prisma, m.userId, 1000, 100);

    const summary = await getFinanceSummary(ADMIN);

    expect(summary.totalRevenue).toBe(1000);
    expect(summary.byMethod["بنكيلي"]).toBe(1000);
    expect(summary.byMethodDetail["بنكيلي"].intisab).toEqual([{ name: "محمد", amount: 100 }]);
    expect(summary.byMethodDetail["بنكيلي"].daem).toEqual([{ name: "محمد", amount: 900 }]);
  });

  it("puts both halves on the day the payment was taken", async () => {
    const m = await member("محمد");
    await recordMembershipPayment(prisma, m.userId, 1000, 100);

    const summary = await getFinanceSummary(ADMIN);

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
    await recordMembershipPayment(prisma, m.userId, 100, 100);

    const summary = await getFinanceSummary(ADMIN);

    expect(summary.totalRevenue).toBe(100);
    expect(summary.byMethodDetail["بنكيلي"].daem).toEqual([]);
  });

  it("leaves out a payment still awaiting review", async () => {
    const m = await member("محمد", "PENDING");
    await recordMembershipPayment(prisma, m.userId, 1000, 100);

    expect((await getFinanceSummary(ADMIN)).totalRevenue).toBe(0);
  });

  it("keeps an anonymous gift out of the named list but inside the total", async () => {
    await gift(500, { method: "السداد" });

    const summary = await getFinanceSummary(ADMIN);

    expect(summary.totalRevenue).toBe(500);
    expect(summary.byMethodDetail["السداد"].anonymousTotal).toBe(500);
    expect(summary.byMethodDetail["السداد"].daem).toEqual([]);
  });

  it("lists a gift with no method by its donation id, which is what assigns one", async () => {
    const donation = await gift(500, { name: "زائر" });

    const summary = await getFinanceSummary(ADMIN);

    expect(summary.unassigned).toEqual([{ id: donation.id, name: "زائر", amount: 500 }]);
  });

  it("keeps an old payment in the totals but off the day list", async () => {
    const m = await member("محمد");
    await recordMembershipPayment(prisma, m.userId, 1000, 100);
    await prisma.payment.updateMany({ data: { createdAt: new Date("2020-01-01T12:00:00Z") } });

    const summary = await getFinanceSummary(ADMIN, 30);

    expect(summary.totalRevenue).toBe(1000);
    expect(summary.byMethod["بنكيلي"]).toBe(1000);
    expect(summary.byMethodDetail["بنكيلي"].intisab).toEqual([{ name: "محمد", amount: 100 }]);
    expect(summary.byMethodDetail["بنكيلي"].daem).toEqual([{ name: "محمد", amount: 900 }]);
    expect(summary.days).toEqual([]);
    expect(summary.allRecords).toEqual([]);
  });

  it("still lists an old gift with no method for assignment", async () => {
    const donation = await gift(500, { name: "زائر" });
    await prisma.payment.updateMany({ data: { createdAt: new Date("2020-01-01T12:00:00Z") } });

    const summary = await getFinanceSummary(ADMIN, 30);

    expect(summary.unassigned).toEqual([{ id: donation.id, name: "زائر", amount: 500 }]);
  });

  it("adds a donor's gifts together under each method they used", async () => {
    await gift(300, { name: "زائر", method: "السداد" });
    await gift(200, { name: "زائر", method: "السداد" });
    await gift(100, { name: "زائر", method: "بنكيلي" });

    const summary = await getFinanceSummary(ADMIN);

    expect(summary.byMethodDetail["السداد"].daem).toEqual([{ name: "زائر", amount: 500 }]);
    expect(summary.byMethodDetail["بنكيلي"].daem).toEqual([{ name: "زائر", amount: 100 }]);
  });

  it("names an unnamed giver on the day list the way the board does", async () => {
    await gift(500, { method: "السداد" });

    const summary = await getFinanceSummary(ADMIN);

    expect(summary.allRecords[0].name).toBe(ANON);
  });
});
