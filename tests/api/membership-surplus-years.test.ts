import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { saveAppSettings } from "@/lib/settingsServer";
import { runningYear } from "@/lib/membershipYear";
import { mirrorMembershipPayment } from "@/lib/paymentMirror";
import { resetDb, post, createAdmin, signInAsAdmin, withId } from "./helpers";

import { POST as RENEW } from "@/app/api/admin/members/[id]/renew/route";

const YEAR = runningYear();
const LAST = YEAR - 1;

function memberOnLastYear() {
  return prisma.member.create({
    data: {
      user: { create: {} },
      fullName: "محمد ولد أحمد",
      age: "البدريين",
      paymentMethod: "بنكيلي",
      status: "ACTIVE",
      paidAmount: 100,
      membershipYear: LAST,
      memberNumber: "AJVT-2025-0001",
    },
  });
}

async function lastYearSurplus(memberId: string, amount: number) {
  const donation = await prisma.donation.create({
    data: {
      memberId,
      membershipYear: LAST,
      source: "MEMBERSHIP",
      amount,
      status: "ACTIVE",
      donorName: "محمد ولد أحمد",
    },
  });
  await mirrorMembershipPayment(prisma, {
    memberId,
    year: LAST,
    amount: 100 + amount,
    feeApplied: 100,
    method: "بنكيلي",
    proof: null,
    status: "ACTIVE",
    anonymous: false,
    donorName: "محمد ولد أحمد",
  });
  return donation;
}

const renew = (id: string, paidAmount: number) =>
  RENEW(
    post(`/api/admin/members/${id}/renew`, { paidAmount, paymentMethod: "بنكيلي" }),
    withId(id),
  );

const surplusRows = (memberId: string) =>
  prisma.donation.findMany({
    where: { memberId, source: "MEMBERSHIP" },
    orderBy: { membershipYear: "asc" },
  });

describe("a surplus belongs to the year it was paid for", () => {
  beforeEach(async () => {
    await resetDb();
    await saveAppSettings({ membershipYear: YEAR, membershipFee: 100 });
    await signInAsAdmin(await createAdmin("boss", "SUPER"));
  });

  it("leaves last year's surplus standing when this year's is recorded", async () => {
    const m = await memberOnLastYear();
    await lastYearSurplus(m.id, 400);

    await renew(m.id, 1000);

    const rows = await surplusRows(m.id);
    expect(rows.map((r) => r.membershipYear)).toEqual([LAST, YEAR]);
    expect(rows.map((r) => r.amount)).toEqual([400, 900]);
  });

  it("keeps both years on the honour board rather than one", async () => {
    const m = await memberOnLastYear();
    await lastYearSurplus(m.id, 400);

    await renew(m.id, 1000);

    const { getLeaderboardData } = await import("@/lib/donationsServer");
    const { leaderboard } = await getLeaderboardData();
    expect(leaderboard.find((e) => e.name === "محمد ولد أحمد")?.total).toBe(1300);
  });

  it("still corrects this year's row rather than adding a second one", async () => {
    const m = await memberOnLastYear();
    await renew(m.id, 1000);

    const { recordMembershipPayment } = await import("@/lib/membershipPaymentServer");
    await recordMembershipPayment(prisma, m.id, 600, 100);

    const rows = await surplusRows(m.id);
    expect(rows).toHaveLength(1);
    expect(rows[0].amount).toBe(500);
    expect(rows[0].membershipYear).toBe(YEAR);
  });

  it("does not withdraw last year's surplus when this year's membership is refused", async () => {
    const m = await memberOnLastYear();
    await lastYearSurplus(m.id, 400);
    await renew(m.id, 1000);

    const { syncSurplusStatus } = await import("@/lib/membershipPaymentServer");
    await prisma.member.update({ where: { id: m.id }, data: { status: "REJECTED" } });
    await syncSurplusStatus(prisma, m.id);

    const rows = await surplusRows(m.id);
    expect(rows.map((r) => r.status)).toEqual(["ACTIVE", "REJECTED"]);
  });

  it("tags a first surplus with the year the membership covers", async () => {
    const m = await prisma.member.create({
      data: {
        user: { create: {} },
        fullName: "أحمد",
        age: "البدريين",
        paymentMethod: "بنكيلي",
        status: "PENDING",
        membershipYear: YEAR,
      },
    });

    const { recordMembershipPayment } = await import("@/lib/membershipPaymentServer");
    await recordMembershipPayment(prisma, m.id, 300, 100);

    const rows = await surplusRows(m.id);
    expect(rows[0].membershipYear).toBe(YEAR);
    expect(rows[0].amount).toBe(200);
  });
});
