import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { runningYear } from "@/lib/membershipYear";
import { MEMBERSHIP_FEE } from "@/lib/donations";
import { resetDb, get, createAdmin, signInAsAdmin, withId, makeMember } from "./helpers";

import { GET as PROFILE } from "@/app/api/admin/members/[id]/profile/route";
import { GET as YEARS } from "@/app/api/admin/members/[id]/memberships/route";

const YEAR = runningYear();

async function paidMember(over: Record<string, unknown> = {}) {
  return makeMember({
    fullName: "محمد",
    age: "البدريين",
    status: "ACTIVE",
    membershipYear: YEAR,
    paidAmount: MEMBERSHIP_FEE,
    ...over,
  });
}

const profileOf = async (userId: string) =>
  (await (await PROFILE(get(`/api/admin/members/${userId}/profile`), withId(userId))).json())
    .member;

const yearsOf = async (userId: string) =>
  (await (await YEARS(get(`/api/admin/members/${userId}/memberships`), withId(userId))).json())
    .memberships;

describe("the admin's page for one member reads the payment off the payment", () => {
  beforeEach(async () => {
    await resetDb();
    await signInAsAdmin(await createAdmin("boss", "SUPER"));
  });

  it("takes the method, the proof and the reference code from the payment", async () => {
    const m = await paidMember({
      paymentMethod: "بنكيلي",
      paymentProof: "paid.jpg",
      referenceCode: "AJ-PAID",
    });
    expect(await profileOf(m.userId)).toMatchObject({
      paymentMethod: "بنكيلي",
      paymentProof: "paid.jpg",
      referenceCode: "AJ-PAID",
    });
  });

  it("takes the account from the payment", async () => {
    const m = await paidMember({ paymentMethod: "بنكيلي" });
    const account = await prisma.paymentAccount.findFirstOrThrow({
      where: { method: { name: "بنكيلي" } },
    });
    await prisma.payment.updateMany({
      where: { userId: m.userId, year: YEAR, purpose: "MEMBERSHIP" },
      data: { accountId: account.id },
    });
    const member = await profileOf(m.userId);

    expect(member.accountId).toBe(account.id);
    expect(member.account).toMatchObject({ id: account.id, code: account.code });
  });

  it("leaves the payment fields empty when no payment carries them", async () => {
    const m = await makeMember({
      fullName: "بلا دفعة",
      age: "البدريين",
      status: "PENDING",
      membershipYear: YEAR,
    });
    expect(await profileOf(m.userId)).toMatchObject({
      paymentMethod: null,
      accountId: null,
      account: null,
      paymentProof: null,
      referenceCode: null,
    });
  });

  it("keeps the standing and the ending on the membership", async () => {
    const m = await paidMember({ paymentMethod: "بنكيلي", status: "ACTIVE" });

    const member = await profileOf(m.userId);

    expect(member.status).toBe("ACTIVE");
    expect(member.membershipYear).toBe(YEAR);
    expect(member.endedAt).toBeNull();
  });

  it("takes the method and who recorded it from the payment on the year panel", async () => {
    const m = await paidMember({ paymentMethod: "بنكيلي" });
    await prisma.payment.updateMany({
      where: { userId: m.userId, year: YEAR, purpose: "MEMBERSHIP" },
      data: { recordedBy: "boss" },
    });

    const [row] = await yearsOf(m.userId);

    expect(row).toMatchObject({ year: YEAR, paymentMethod: "بنكيلي", recordedBy: "boss" });
  });

  it("names who recorded a year the membership never recorded", async () => {
    const m = await paidMember({ paymentMethod: "بنكيلي" });
    await prisma.payment.updateMany({
      where: { userId: m.userId, year: YEAR, purpose: "MEMBERSHIP" },
      data: { recordedBy: "boss" },
    });

    const [row] = await yearsOf(m.userId);

    expect(row.recordedBy).toBe("boss");
  });
});
