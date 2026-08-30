import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { saveAppSettings } from "@/lib/settingsServer";
import { runningYear } from "@/lib/membershipYear";
import {
  resetDb,
  get,
  patch,
  put,
  createAdmin,
  signInAsAdmin,
  withId,
  makeMember,
} from "./helpers";

import { GET as PROFILE } from "@/app/api/admin/members/[id]/profile/route";
import { GET as YEARS } from "@/app/api/admin/members/[id]/memberships/route";
import { PATCH as EDIT } from "@/app/api/admin/members/[id]/route";
import { PUT as PAY } from "@/app/api/admin/members/[id]/payment/route";

const YEAR = runningYear();

async function overpaidMember() {
  const m = await makeMember({
    fullName: "محمد ولد أحمد",
    age: "البدريين",
    paymentMethod: "بنكيلي",
    status: "ACTIVE",
    membershipYear: YEAR,
    memberNumber: "AJVT-2026-0001",
  });
  await prisma.membership.create({
    data: {
      userId: m.userId,
      year: YEAR,
      paidAmount: 100,
      paymentMethod: "بنكيلي",
    },
  });
  const { recordMembershipPayment } = await import("@/lib/membershipPaymentServer");
  await recordMembershipPayment(prisma, m.id, 2100, 100);
  return m;
}

const paymentOf = (memberId: string) =>
  prisma.payment.findFirstOrThrow({
    where: { user: { members: { some: { id: memberId } } }, purpose: "MEMBERSHIP", year: YEAR },
  });

const surplusOf = async (memberId: string) => {
  const payment = await paymentOf(memberId);
  return payment.amount - (payment.feeApplied ?? 0);
};

const feeOf = async (memberId: string) => {
  const payment = await paymentOf(memberId);
  return Math.min(payment.amount, payment.feeApplied ?? payment.amount);
};

describe("a form that sends back what it was given changes nothing", () => {
  beforeEach(async () => {
    await resetDb();
    await saveAppSettings({ membershipYear: YEAR, membershipFee: 100 });
    await signInAsAdmin(await createAdmin("boss", "SUPER"));
  });

  it("hands the edit form the whole amount, not just the fee", async () => {
    const m = await overpaidMember();

    const { member } = await (
      await PROFILE(get(`/api/admin/members/${m.id}/profile`), withId(m.id))
    ).json();

    expect(member.paidAmount + member.supportAmount).toBe(2100);
  });

  it("keeps the surplus when the edit form saves an untouched amount", async () => {
    const m = await overpaidMember();
    const { member } = await (
      await PROFILE(get(`/api/admin/members/${m.id}/profile`), withId(m.id))
    ).json();

    await EDIT(
      patch(`/api/admin/members/${m.id}`, { fullName: member.fullName, age: member.age }),
      withId(m.id),
    );
    await PAY(
      put(`/api/admin/members/${m.id}/payment`, {
        amountTransferred: member.paidAmount + member.supportAmount,
        paymentMethod: member.paymentMethod,
      }),
      withId(m.id),
    );

    expect(await surplusOf(m.id)).toBe(2000);
    expect(await feeOf(m.id)).toBe(100);
  });

  it("cannot touch the money at all through the identity endpoint", async () => {
    const m = await overpaidMember();

    await EDIT(patch(`/api/admin/members/${m.id}`, { fullName: "محمد ولد أحمدُ" }), withId(m.id));

    expect(await surplusOf(m.id)).toBe(2000);
  });

  it("hands the year panel the whole amount for that year", async () => {
    const m = await overpaidMember();

    const { memberships } = await (
      await YEARS(get(`/api/admin/members/${m.id}/memberships`), withId(m.id))
    ).json();

    const current = memberships.find((y: { year: number }) => y.year === YEAR);
    expect(current.paidAmount + current.supportAmount).toBe(2100);
  });

  it("still lets an admin genuinely lower the amount", async () => {
    const m = await overpaidMember();

    await PAY(put(`/api/admin/members/${m.id}/payment`, { amountTransferred: 500 }), withId(m.id));

    expect(await surplusOf(m.id)).toBe(400);
    expect(await feeOf(m.id)).toBe(100);
  });

  it("still lets an admin drop the surplus on purpose", async () => {
    const m = await overpaidMember();

    await PAY(put(`/api/admin/members/${m.id}/payment`, { amountTransferred: 100 }), withId(m.id));

    expect(await surplusOf(m.id)).toBe(0);
  });
});

describe("the identity endpoint owns no money", () => {
  beforeEach(async () => {
    await resetDb();
    await saveAppSettings({ membershipYear: YEAR, membershipFee: 100 });
    await signInAsAdmin(await createAdmin("boss", "SUPER"));
  });

  it("ignores an amount smuggled into a member edit", async () => {
    const m = await overpaidMember();

    await EDIT(
      patch(`/api/admin/members/${m.id}`, { fullName: "اسم آخر", paidAmount: 100 }),
      withId(m.id),
    );

    expect(await surplusOf(m.id)).toBe(2000);
  });

  it("still refuses a payment below the fee", async () => {
    const m = await overpaidMember();

    const res = await PAY(
      put(`/api/admin/members/${m.id}/payment`, { amountTransferred: 40 }),
      withId(m.id),
    );

    expect(res.status).toBe(400);
    expect(await surplusOf(m.id)).toBe(2000);
  });

  it("is closed to an admin without the members section", async () => {
    const m = await overpaidMember();
    await signInAsAdmin(await createAdmin("quiz", "QUIZ"));

    const res = await PAY(
      put(`/api/admin/members/${m.id}/payment`, { amountTransferred: 500 }),
      withId(m.id),
    );

    expect(res.status).toBe(403);
  });
});
