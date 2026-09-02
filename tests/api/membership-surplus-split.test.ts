import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { SUPER_ROLE } from "@/lib/adminRoles";
import {
  resetDb,
  post,
  put,
  createUser,
  createAdmin,
  signInAs,
  signInAsAdmin,
  withId,
} from "./helpers";
import { recordMembershipPayment, totalPaidFor } from "@/lib/membershipPaymentServer";

import { POST as REGISTER } from "@/app/api/members/route";
import { POST as VALIDATE } from "@/app/api/admin/validate/route";
import { PUT as PAY } from "@/app/api/admin/members/[id]/payment/route";

const submission = {
  fullName: "محمد ولد أحمد",
  age: "البدريين",
  paymentMethod: "بنكيلي",
  paymentProof: "proof.webp",
  paidAmount: 2100,
};

async function join(body: Record<string, unknown> = {}) {
  await signInAs(await createUser());
  await REGISTER(post("/api/members", { ...submission, ...body }));
  return prisma.membership.findFirstOrThrow();
}

// The fee and the surplus are both worked out from the one payment.
const fee = async (memberId: string) => {
  const payment = await prisma.payment.findFirst({
    where: { userId: memberId, purpose: "MEMBERSHIP" },
  });
  if (!payment) return null;
  return Math.min(payment.amount, payment.feeApplied ?? payment.amount);
};

// The surplus is the part of the payment above the fee. There is no surplus
// when the payment covers the fee and no more.
const surplus = async (memberId: string) => {
  const payment = await prisma.payment.findFirst({
    where: { userId: memberId, purpose: "MEMBERSHIP" },
  });
  if (!payment) return null;
  const amount = payment.amount - (payment.feeApplied ?? 0);
  return amount > 0 ? { amount, status: payment.status } : null;
};

const ADMIN = { role: SUPER_ROLE };

describe("the fee and the surplus are worked out from one payment", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("counts only the fee as the fee", async () => {
    const member = await join();

    expect(await fee(member.userId)).toBe(100);
  });

  it("counts the rest as support", async () => {
    const member = await join();

    expect((await surplus(member.userId))?.amount).toBe(2000);
  });

  it("adds back up to what the member actually transferred", async () => {
    const member = await join();

    expect(await totalPaidFor(prisma, member.userId)).toBe(2100);
  });

  it("keeps the surplus out of the honour board until an admin approves", async () => {
    const member = await join();

    expect((await surplus(member.userId))?.status).toBe("PENDING");
    const { getLeaderboardData } = await import("@/lib/donationsServer");
    expect((await getLeaderboardData(ADMIN)).leaderboard).toHaveLength(0);
  });

  it("publishes the surplus once the membership is approved", async () => {
    const member = await join();
    await signInAsAdmin(await createAdmin());

    await VALIDATE(post("/api/admin/validate", { id: member.userId, action: "ACTIVE" }));

    expect((await surplus(member.userId))?.status).toBe("ACTIVE");
  });

  it("withdraws the surplus when the membership is refused", async () => {
    const member = await join();
    await signInAsAdmin(await createAdmin());

    await VALIDATE(
      post("/api/admin/validate", {
        id: member.userId,
        action: "REJECTED",
        rejectionReason: "الصورة غير واضحة",
      }),
    );

    expect((await surplus(member.userId))?.status).toBe("REJECTED");
    const { getLeaderboardData } = await import("@/lib/donationsServer");
    expect((await getLeaderboardData(ADMIN)).leaderboard).toHaveLength(0);
  });

  it("leaves no surplus when the member paid exactly the fee", async () => {
    const member = await join({ paidAmount: 100 });

    expect(await fee(member.userId)).toBe(100);
    expect(await surplus(member.userId)).toBeNull();
  });

  it("drops the surplus when an admin corrects the amount down to the fee", async () => {
    const member = await join();
    await signInAsAdmin(await createAdmin());

    await PAY(
      put(`/api/admin/members/${member.userId}/payment`, { amountTransferred: 100 }),
      withId(member.userId),
    );

    expect(await fee(member.userId)).toBe(100);
    expect(await surplus(member.userId)).toBeNull();
  });

  it("moves the surplus when an admin corrects the amount up", async () => {
    const member = await join({ paidAmount: 100 });
    await signInAsAdmin(await createAdmin());

    await PAY(
      put(`/api/admin/members/${member.userId}/payment`, { amountTransferred: 600 }),
      withId(member.userId),
    );

    expect(await fee(member.userId)).toBe(100);
    expect((await surplus(member.userId))?.amount).toBe(500);
  });

  it("keeps the year record on the fee, never the whole transfer", async () => {
    const member = await join();
    await signInAsAdmin(await createAdmin());

    await VALIDATE(post("/api/admin/validate", { id: member.userId, action: "ACTIVE" }));

    await prisma.membership.findFirstOrThrow({ where: { userId: member.userId } });
    expect(await fee(member.userId)).toBe(100);
  });

  it("clears the payment when the amount is removed altogether", async () => {
    const member = await join();

    await recordMembershipPayment(prisma, member.userId, null, 100);

    expect(await fee(member.userId)).toBeNull();
    expect(await surplus(member.userId)).toBeNull();
    expect(await totalPaidFor(prisma, member.userId)).toBeNull();
  });
});
