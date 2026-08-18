import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { saveAppSettings } from "@/lib/settingsServer";
import { runningYear } from "@/lib/membershipYear";
import { resetDb, patch, createAdmin, signInAsAdmin } from "./helpers";

import { PATCH as UPDATE } from "@/app/api/admin/members/[id]/route";

const withId = (id: string) => ({ params: Promise.resolve({ id }) });
const YEAR = runningYear();

async function memberMissingAmount() {
  const m = await prisma.member.create({
    data: {
      fullName: "محمد ولد أحمد",
      age: "البدريين",
      paymentMethod: "بنكيلي",
      status: "ACTIVE",
      paidAmount: null,
      membershipYear: YEAR,
      memberNumber: "AJVT-2026-0001",
    },
  });
  await prisma.membership.create({
    data: { memberId: m.id, year: YEAR, paidAmount: null, paymentMethod: "بنكيلي" },
  });
  return m;
}

describe("entering an amount that was never recorded", () => {
  beforeEach(async () => {
    await resetDb();
    await saveAppSettings({ membershipYear: YEAR, membershipFee: 100 });
    await signInAsAdmin(await createAdmin());
  });

  it("writes the amount onto the year it belongs to", async () => {
    const m = await memberMissingAmount();

    const res = await UPDATE(
      patch(`/api/admin/members/${m.id}`, { paidAmount: 100 }),
      withId(m.id),
    );
    expect(res.status).toBe(200);

    const year = await prisma.membership.findFirst({ where: { memberId: m.id, year: YEAR } });
    expect(year?.paidAmount).toBe(100);
  });

  it("turns an amount above the fee into support for that member", async () => {
    const m = await memberMissingAmount();

    await UPDATE(patch(`/api/admin/members/${m.id}`, { paidAmount: 300 }), withId(m.id));

    const year = await prisma.membership.findFirst({ where: { memberId: m.id, year: YEAR } });
    expect(year?.paidAmount).toBe(300);

    const support = await prisma.donation.findFirst({
      where: { memberId: m.id, source: "MEMBERSHIP" },
    });
    expect(support?.amount).toBe(200);
  });

  it("leaves the year alone when the edit does not touch the payment", async () => {
    const m = await memberMissingAmount();
    await prisma.membership.updateMany({
      where: { memberId: m.id, year: YEAR },
      data: { paidAmount: 100 },
    });

    await UPDATE(patch(`/api/admin/members/${m.id}`, { fullName: "أحمد ولد محمد" }), withId(m.id));

    const year = await prisma.membership.findFirst({ where: { memberId: m.id, year: YEAR } });
    expect(year?.paidAmount).toBe(100);
  });
});
