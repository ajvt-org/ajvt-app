import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { saveAppSettings } from "@/lib/settingsServer";
import { runningYear } from "@/lib/membershipYear";
import { members } from "@/lib/messages";
import { resetDb, post, createUser, signInAs, makeMember } from "./helpers";

import { POST as RENEW_SELF } from "@/app/api/members/renew/route";

const YEAR = runningYear();
const LAST = YEAR - 1;
const FEE = 100;

const body = {
  paymentMethod: "بنكيلي",
  paidAmount: FEE,
  paymentProof: "proof.jpg",
};

const renew = (over: Record<string, unknown> = {}) =>
  RENEW_SELF(post("/api/members/renew", { ...body, ...over }));

async function signedInMember(over: Record<string, unknown> = {}) {
  const user = await createUser();
  await makeMember({
    userId: user.id,
    status: "ACTIVE",
    membershipYear: LAST,
    paymentMethod: "بنكيلي",
    paidAmount: FEE,
    memberNumber: "AJVT-2025-0001",
    ...over,
  });
  await signInAs(user);
  return user;
}

const latest = (userId: string) =>
  prisma.membership.findFirstOrThrow({ where: { userId }, orderBy: { year: "desc" } });

describe("a member renewing their own membership", () => {
  beforeEach(async () => {
    await resetDb();
    await saveAppSettings({ membershipYear: YEAR, membershipFee: FEE });
  });

  it("opens the running year without an admin", async () => {
    const user = await signedInMember();

    const res = await renew();

    expect(res.status).toBe(201);
    expect((await latest(user.id)).year).toBe(YEAR);
  });

  it("leaves the new year waiting for review rather than accepting it", async () => {
    const user = await signedInMember();

    await renew();

    const row = await latest(user.id);
    expect(row.status).toBe("PENDING");
    expect(row.reviewedBy).toBeNull();
    expect(row.reviewedAt).toBeNull();
  });

  it("names the member as the one who recorded it", async () => {
    const user = await signedInMember();

    await renew();

    expect((await latest(user.id)).recordedBy).toBe("محمد ولد أحمد");
  });

  it("banks the money as a payment waiting on the same review", async () => {
    const user = await signedInMember();

    await renew({ paidAmount: FEE + 400 });

    const payment = await prisma.payment.findFirstOrThrow({
      where: { userId: user.id, purpose: "MEMBERSHIP", year: YEAR },
    });
    expect(payment.amount).toBe(FEE + 400);
    expect(payment.status).toBe("PENDING");
  });

  it("keeps the year that was already paid", async () => {
    const user = await signedInMember();

    await renew();

    const previous = await prisma.membership.findFirstOrThrow({
      where: { userId: user.id, year: LAST },
    });
    expect(previous.status).toBe("ACTIVE");
    expect(
      await prisma.payment.count({ where: { userId: user.id, purpose: "MEMBERSHIP", year: LAST } }),
    ).toBe(1);
  });

  it("records the renewal as the member's own action", async () => {
    const user = await signedInMember();

    await renew();

    const entry = await prisma.auditLog.findFirstOrThrow({
      where: { targetId: user.id, action: "RENEW_OWN_MEMBERSHIP" },
    });
    expect(entry.adminUsername).toBe("محمد ولد أحمد");
    expect(entry.adminId).toBeNull();
    expect(entry.adminRole).toBeNull();
  });

  it("refuses a membership that was never accepted", async () => {
    await signedInMember({ status: "REJECTED" });

    const res = await renew();

    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe(members.renewNotActive);
  });

  it("refuses a member with no number yet", async () => {
    await signedInMember({ memberNumber: null });

    const res = await renew();

    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe(members.renewNotIssued);
  });

  it("refuses a member already on the running year", async () => {
    await signedInMember({ membershipYear: YEAR });

    const res = await renew();

    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe(members.renewAlreadyDone);
  });

  it("refuses a member whose membership runs ahead of the running year", async () => {
    await signedInMember({ membershipYear: YEAR + 1 });

    const res = await renew();

    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe(members.renewYearBehind);
  });

  it("refuses an amount under the fee", async () => {
    await signedInMember();

    const res = await renew({ paidAmount: FEE - 1 });

    expect(res.status).toBe(400);
  });

  it("refuses a renewal with no proof", async () => {
    await signedInMember();

    const res = await renew({ paymentProof: "" });

    expect(res.status).toBe(400);
  });

  it("refuses a method members are not offered", async () => {
    await signedInMember();

    const res = await renew({ paymentMethod: "نقداً" });

    expect(res.status).toBe(400);
  });

  it("turns away someone who is not signed in", async () => {
    await resetDb();

    const res = await renew();

    expect(res.status).toBe(401);
  });
});
