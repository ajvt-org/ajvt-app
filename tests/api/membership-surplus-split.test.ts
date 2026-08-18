import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { resetDb, post, patch, createUser, createAdmin, signInAs, signInAsAdmin } from "./helpers";
import { recordMembershipPayment, totalPaidFor } from "@/lib/membershipPaymentServer";

import { POST as REGISTER } from "@/app/api/members/route";
import { POST as VALIDATE } from "@/app/api/admin/validate/route";
import { PATCH as EDIT_MEMBER } from "@/app/api/admin/members/[id]/route";

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
  return prisma.member.findFirstOrThrow();
}

const surplus = (memberId: string) =>
  prisma.donation.findFirst({ where: { memberId, source: "MEMBERSHIP" } });

describe("the fee and the surplus live in one place each", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("banks only the fee on the member", async () => {
    const member = await join();

    expect(member.paidAmount).toBe(100);
  });

  it("puts the rest in the donations table", async () => {
    const member = await join();

    expect((await surplus(member.id))?.amount).toBe(2000);
  });

  it("adds back up to what the member actually transferred", async () => {
    const member = await join();

    expect(await totalPaidFor(prisma, member.id)).toBe(2100);
  });

  it("keeps the surplus out of the honour board until an admin approves", async () => {
    const member = await join();

    expect((await surplus(member.id))?.status).toBe("PENDING");
    const { getLeaderboardData } = await import("@/lib/donationsServer");
    expect((await getLeaderboardData()).leaderboard).toHaveLength(0);
  });

  it("publishes the surplus once the membership is approved", async () => {
    const member = await join();
    await signInAsAdmin(await createAdmin());

    await VALIDATE(post("/api/admin/validate", { id: member.id, action: "ACTIVE" }));

    expect((await surplus(member.id))?.status).toBe("ACTIVE");
  });

  it("withdraws the surplus when the membership is refused", async () => {
    const member = await join();
    await signInAsAdmin(await createAdmin());

    await VALIDATE(
      post("/api/admin/validate", {
        id: member.id,
        action: "REJECTED",
        rejectionReason: "الصورة غير واضحة",
      }),
    );

    expect((await surplus(member.id))?.status).toBe("REJECTED");
    const { getLeaderboardData } = await import("@/lib/donationsServer");
    expect((await getLeaderboardData()).leaderboard).toHaveLength(0);
  });

  it("creates no donation when the member paid exactly the fee", async () => {
    const member = await join({ paidAmount: 100 });

    expect(member.paidAmount).toBe(100);
    expect(await surplus(member.id)).toBeNull();
  });

  it("drops the donation when an admin corrects the amount down to the fee", async () => {
    const member = await join();
    await signInAsAdmin(await createAdmin());

    await EDIT_MEMBER(patch(`/api/admin/members/${member.id}`, { paidAmount: 100 }), {
      params: Promise.resolve({ id: member.id }),
    });

    expect((await prisma.member.findUniqueOrThrow({ where: { id: member.id } })).paidAmount).toBe(
      100,
    );
    expect(await surplus(member.id)).toBeNull();
  });

  it("moves the surplus when an admin corrects the amount up", async () => {
    const member = await join({ paidAmount: 100 });
    await signInAsAdmin(await createAdmin());

    await EDIT_MEMBER(patch(`/api/admin/members/${member.id}`, { paidAmount: 600 }), {
      params: Promise.resolve({ id: member.id }),
    });

    expect((await prisma.member.findUniqueOrThrow({ where: { id: member.id } })).paidAmount).toBe(
      100,
    );
    expect((await surplus(member.id))?.amount).toBe(500);
  });

  it("keeps the year record on the fee, never the whole transfer", async () => {
    const member = await join();
    await signInAsAdmin(await createAdmin());

    await VALIDATE(post("/api/admin/validate", { id: member.id, action: "ACTIVE" }));

    const record = await prisma.membership.findFirstOrThrow({ where: { memberId: member.id } });
    expect(record.paidAmount).toBe(100);
  });

  it("clears both sides when the amount is removed altogether", async () => {
    const member = await join();

    await recordMembershipPayment(prisma, member.id, null, 100);

    expect(
      (await prisma.member.findUniqueOrThrow({ where: { id: member.id } })).paidAmount,
    ).toBeNull();
    expect(await surplus(member.id)).toBeNull();
    expect(await totalPaidFor(prisma, member.id)).toBeNull();
  });
});
