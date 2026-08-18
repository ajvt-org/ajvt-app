import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { resetDb, post, createUser, createAdmin, signInAs, signInAsAdmin } from "./helpers";

import { POST as REGISTER } from "@/app/api/members/route";
import { POST as VALIDATE } from "@/app/api/admin/validate/route";

const submission = {
  fullName: "محمد ولد أحمد",
  age: "البدريين",
  paymentMethod: "بنكيلي",
  paymentProof: "proof.webp",
  paidAmount: 500,
};

async function joinAndApprove(body: Record<string, unknown> = {}) {
  await signInAs(await createUser());
  await REGISTER(post("/api/members", { ...submission, ...body }));
  const member = await prisma.member.findFirstOrThrow();
  await signInAsAdmin(await createAdmin());
  await VALIDATE(post("/api/admin/validate", { id: member.id, action: "ACTIVE" }));
  return member;
}

function surplusOf(memberId: string) {
  return prisma.donation.findFirstOrThrow({ where: { memberId, source: "MEMBERSHIP" } });
}

describe("who the membership surplus is credited to", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("carries the member name when they agreed to be named", async () => {
    const member = await joinAndApprove({ surplusAnonymous: false });

    const donation = await surplusOf(member.id);
    expect(donation.amount).toBe(400);
    expect(donation.donorName).toBe("محمد ولد أحمد");
  });

  it("stays unnamed when the member asked to remain anonymous", async () => {
    const member = await joinAndApprove({ surplusAnonymous: true });

    const donation = await surplusOf(member.id);
    expect(donation.amount).toBe(400);
    expect(donation.donorName).toBeNull();
  });

  it("defaults to naming them when the form said nothing", async () => {
    const member = await joinAndApprove();

    expect((await surplusOf(member.id)).donorName).toBe("محمد ولد أحمد");
  });

  it("keeps an anonymous surplus off the honour board by name", async () => {
    const member = await joinAndApprove({ surplusAnonymous: true });
    const { getLeaderboardData } = await import("@/lib/donationsServer");

    const { leaderboard } = await getLeaderboardData();

    expect(leaderboard.map((e) => e.name)).not.toContain("محمد ولد أحمد");
    expect(leaderboard.some((e) => e.anonymous && e.total === 400)).toBe(true);
    void member;
  });

  it("does not rename an anonymous surplus when the amount is corrected later", async () => {
    const member = await joinAndApprove({ surplusAnonymous: true });
    const { recordMembershipPayment } = await import("@/lib/membershipPaymentServer");

    await recordMembershipPayment(prisma, member.id, 900, 100);

    const donation = await surplusOf(member.id);
    expect(donation.amount).toBe(800);
    expect(donation.donorName).toBeNull();
  });

  it("does not rename a named surplus either, once it is published", async () => {
    const member = await joinAndApprove({ surplusAnonymous: false });
    const { recordMembershipPayment } = await import("@/lib/membershipPaymentServer");

    await prisma.member.update({ where: { id: member.id }, data: { fullName: "اسم آخر" } });
    await recordMembershipPayment(prisma, member.id, 700, 100);

    const donation = await surplusOf(member.id);
    expect(donation.amount).toBe(600);
    expect(donation.donorName).toBe("محمد ولد أحمد");
  });
});
