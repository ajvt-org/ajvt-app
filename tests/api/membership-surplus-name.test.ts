import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  resetDb,
  post,
  patch,
  createUser,
  createAdmin,
  signInAs,
  signInAsAdmin,
  withId,
} from "./helpers";

import { POST as REGISTER } from "@/app/api/members/route";
import { POST as VALIDATE } from "@/app/api/admin/validate/route";
import { PATCH as UPDATE_MEMBER } from "@/app/api/members/[id]/route";

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

function mirrorOf(memberId: string) {
  return prisma.payment.findFirstOrThrow({ where: { memberId, purpose: "MEMBERSHIP" } });
}

function changeVisibility(memberId: string, anonymous: boolean) {
  return UPDATE_MEMBER(
    patch(`/api/members/${memberId}`, { surplusAnonymous: anonymous }),
    withId(memberId),
  );
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

  it("lets the member take their own name off a surplus already published", async () => {
    const user = await createUser();
    await signInAs(user);
    await REGISTER(post("/api/members", { ...submission, surplusAnonymous: false }));
    const member = await prisma.member.findFirstOrThrow();
    await signInAsAdmin(await createAdmin());
    await VALIDATE(post("/api/admin/validate", { id: member.id, action: "ACTIVE" }));
    await signInAs(user);

    const res = await changeVisibility(member.id, true);

    expect(res.status).toBe(200);
    expect((await surplusOf(member.id)).donorName).toBeNull();
    const mirrored = await mirrorOf(member.id);
    expect(mirrored.anonymous).toBe(true);
    expect(mirrored.donorName).toBeNull();
  });

  it("puts the name back when the member changes their mind again", async () => {
    const user = await createUser();
    await signInAs(user);
    await REGISTER(post("/api/members", { ...submission, surplusAnonymous: true }));
    const member = await prisma.member.findFirstOrThrow();
    await signInAsAdmin(await createAdmin());
    await VALIDATE(post("/api/admin/validate", { id: member.id, action: "ACTIVE" }));
    await signInAs(user);

    await changeVisibility(member.id, false);

    expect((await surplusOf(member.id)).donorName).toBe("محمد ولد أحمد");
    expect((await mirrorOf(member.id)).anonymous).toBe(false);
  });

  it("refuses to change a surplus that belongs to another account", async () => {
    const owner = await createUser();
    await signInAs(owner);
    await REGISTER(post("/api/members", { ...submission, surplusAnonymous: false }));
    const member = await prisma.member.findFirstOrThrow();
    await signInAs(await createUser("22119900"));

    const res = await changeVisibility(member.id, true);

    expect(res.status).toBe(404);
    expect((await surplusOf(member.id)).donorName).toBe("محمد ولد أحمد");
  });

  it("does not rename a named surplus either, once it is published", async () => {
    const member = await joinAndApprove({ surplusAnonymous: false });
    const { recordMembershipPayment } = await import("@/lib/membershipPaymentServer");

    await prisma.user.update({ where: { id: member.userId }, data: { fullName: "اسم آخر" } });
    await recordMembershipPayment(prisma, member.id, 700, 100);

    const donation = await surplusOf(member.id);
    expect(donation.amount).toBe(600);
    expect(donation.donorName).toBe("محمد ولد أحمد");
  });
});
