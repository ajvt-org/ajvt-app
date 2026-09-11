import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { saveAppSettings } from "@/lib/settingsServer";
import { runningYear } from "@/lib/membershipYear";
import { AMOUNT_BELOW_FEE } from "@/lib/texts";
import { syncReceiptsFor } from "@/lib/paymentReceiptServer";
import { resetDb, put, createAdmin, signInAsAdmin, withId, makeMember } from "./helpers";

import { PUT as PAY } from "@/app/api/admin/members/[id]/payment/route";

const YEAR = runningYear();

const paymentOf = (userId: string) =>
  prisma.payment.findFirst({ where: { userId, purpose: "MEMBERSHIP", year: YEAR } });

const membershipOf = (userId: string) =>
  prisma.membership.findFirstOrThrow({ where: { userId, year: YEAR } });

function correct(userId: string, body: Record<string, unknown>) {
  return PAY(put(`/api/admin/members/${userId}/payment`, body), withId(userId));
}

async function standing(status: "ACTIVE" | "PENDING" = "ACTIVE") {
  return makeMember({
    fullName: "محمد ولد أحمد",
    age: "البدريين",
    paymentMethod: "بنكيلي",
    status,
    paidAmount: 100,
    membershipYear: YEAR,
  });
}

describe("correcting a membership payment below the fee", () => {
  beforeEach(async () => {
    await resetDb();
    await saveAppSettings({ membershipYear: YEAR, membershipFee: 100 });
    await signInAsAdmin(await createAdmin());
  });

  it("refuses the correction while nobody has said what happens to the membership", async () => {
    const m = await standing();

    const res = await correct(m.userId, { amountTransferred: 40 });

    expect(res.status).toBe(400);
    expect((await paymentOf(m.userId))?.amount).toBe(100);
    expect((await membershipOf(m.userId)).endedAt).toBeNull();
  });

  it("corrects the amount and ends the year together once the admin has said so", async () => {
    const m = await standing();

    const res = await correct(m.userId, { amountTransferred: 40, membershipDecision: "end" });

    expect(res.status).toBe(200);
    expect((await paymentOf(m.userId))?.amount).toBe(40);
    const membership = await membershipOf(m.userId);
    expect(membership.endedAt).not.toBeNull();
    expect(membership.endedReason).toBe(AMOUNT_BELOW_FEE);
    expect(membership.status).toBe("ACTIVE");
  });

  it("writes both acts into the log", async () => {
    const m = await standing();

    await correct(m.userId, { amountTransferred: 40, membershipDecision: "end" });

    const actions = (await prisma.auditLog.findMany({ where: { targetId: m.userId } })).map(
      (row) => row.action,
    );
    expect(actions).toContain("UPDATE_MEMBER_PAYMENT");
    expect(actions).toContain("END_MEMBERSHIP");
  });

  it("leaves a membership nobody has accepted where it is", async () => {
    const m = await standing("PENDING");

    const res = await correct(m.userId, { amountTransferred: 40 });

    expect(res.status).toBe(200);
    expect((await paymentOf(m.userId))?.amount).toBe(40);
    const membership = await membershipOf(m.userId);
    expect(membership.endedAt).toBeNull();
    expect(membership.status).toBe("PENDING");
  });

  it("reissues the receipt at the smaller amount", async () => {
    const m = await standing();
    await syncReceiptsFor(prisma, { userId: m.userId });
    const before = await prisma.receipt.findFirstOrThrow({ where: { status: "ACTIVE" } });
    expect(before.amount).toBe(100);

    await correct(m.userId, { amountTransferred: 40, membershipDecision: "end" });

    const payment = await paymentOf(m.userId);
    const after = await prisma.receipt.findFirstOrThrow({
      where: { paymentId: payment!.id, status: "ACTIVE" },
    });
    expect(after.amount).toBe(40);
  });
});

describe("correcting a membership payment back up", () => {
  beforeEach(async () => {
    await resetDb();
    await saveAppSettings({ membershipYear: YEAR, membershipFee: 100 });
    await signInAsAdmin(await createAdmin());
  });

  async function ended() {
    const m = await standing();
    await correct(m.userId, { amountTransferred: 40, membershipDecision: "end" });
    return m;
  }

  it("leaves the membership ended where nobody asked for it back", async () => {
    const m = await ended();

    const res = await correct(m.userId, { amountTransferred: 100 });

    expect(res.status).toBe(200);
    expect((await paymentOf(m.userId))?.amount).toBe(100);
    expect((await membershipOf(m.userId)).endedAt).not.toBeNull();
  });

  it("brings the membership back when the admin asks for it", async () => {
    const m = await ended();

    await correct(m.userId, { amountTransferred: 100, membershipDecision: "restore" });

    const membership = await membershipOf(m.userId);
    expect(membership.endedAt).toBeNull();
    expect(membership.endedReason).toBeNull();
  });

  it("never undoes an ending made for another reason", async () => {
    const m = await standing();
    await prisma.membership.updateMany({
      where: { userId: m.userId, year: YEAR },
      data: {
        endedAt: new Date(),
        endedReason: "مخالفة النظام الداخلي",
        endedBy: "boss",
      },
    });

    await correct(m.userId, { amountTransferred: 300, membershipDecision: "restore" });

    const membership = await membershipOf(m.userId);
    expect(membership.endedAt).not.toBeNull();
    expect(membership.endedReason).toBe("مخالفة النظام الداخلي");
  });
});
