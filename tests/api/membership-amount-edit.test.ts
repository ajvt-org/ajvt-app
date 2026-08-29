import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { saveAppSettings } from "@/lib/settingsServer";
import { runningYear } from "@/lib/membershipYear";
import { resetDb, patch, put, createAdmin, signInAsAdmin, withId, makeMember } from "./helpers";

import { PATCH as UPDATE } from "@/app/api/admin/members/[id]/route";
import { PUT as PAY } from "@/app/api/admin/members/[id]/payment/route";

const YEAR = runningYear();

async function memberMissingAmount() {
  const m = await makeMember({
    fullName: "محمد ولد أحمد",
    age: "البدريين",
    paymentMethod: "بنكيلي",
    status: "ACTIVE",
    paidAmount: null,
    membershipYear: YEAR,
    memberNumber: "AJVT-2026-0001",
  });
  await prisma.membership.create({
    data: {
      memberId: m.id,
      userId: m.userId,
      year: YEAR,
      paidAmount: null,
      paymentMethod: "بنكيلي",
    },
  });
  return m;
}

// The amount an admin enters lands on the payment for that year.
const paidFor = (memberId: string) =>
  prisma.payment.findFirst({ where: { memberId, purpose: "MEMBERSHIP", year: YEAR } });

describe("entering an amount that was never recorded", () => {
  beforeEach(async () => {
    await resetDb();
    await saveAppSettings({ membershipYear: YEAR, membershipFee: 100 });
    await signInAsAdmin(await createAdmin());
  });

  it("writes the amount onto the year it belongs to", async () => {
    const m = await memberMissingAmount();

    const res = await PAY(
      put(`/api/admin/members/${m.id}/payment`, { amountTransferred: 100 }),
      withId(m.id),
    );
    expect(res.status).toBe(200);

    const payment = await paidFor(m.id);
    expect(payment?.amount).toBe(100);
    expect(payment?.feeApplied).toBe(100);
  });

  it("turns an amount above the fee into support for that member", async () => {
    const m = await memberMissingAmount();

    await PAY(put(`/api/admin/members/${m.id}/payment`, { amountTransferred: 300 }), withId(m.id));

    const payment = await paidFor(m.id);
    expect(payment?.amount).toBe(300);
    expect((payment?.amount ?? 0) - (payment?.feeApplied ?? 0)).toBe(200);
  });

  it("counts only the fee as the fee once the surplus is split out", async () => {
    const m = await memberMissingAmount();

    await PAY(put(`/api/admin/members/${m.id}/payment`, { amountTransferred: 300 }), withId(m.id));

    const payment = await paidFor(m.id);
    expect(Math.min(payment?.amount ?? 0, payment?.feeApplied ?? 0)).toBe(100);
  });

  it("leaves the year alone when the edit does not touch the payment", async () => {
    const m = await memberMissingAmount();
    await PAY(put(`/api/admin/members/${m.id}/payment`, { amountTransferred: 100 }), withId(m.id));

    await UPDATE(patch(`/api/admin/members/${m.id}`, { fullName: "أحمد ولد محمد" }), withId(m.id));

    expect((await paidFor(m.id))?.amount).toBe(100);
  });
});
