import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { saveAppSettings } from "@/lib/settingsServer";
import { runningYear } from "@/lib/membershipYear";
import { surplusForYear } from "@/lib/paidBreakdown";
import { resetDb, get, patch, createAdmin, signInAsAdmin } from "./helpers";

import { GET as PROFILE } from "@/app/api/admin/members/[id]/profile/route";
import { GET as YEARS } from "@/app/api/admin/members/[id]/memberships/route";
import { PATCH as EDIT } from "@/app/api/admin/members/[id]/route";

const YEAR = runningYear();
const withId = (id: string) => ({ params: Promise.resolve({ id }) });

async function overpaidMember() {
  const m = await prisma.member.create({
    data: {
      fullName: "محمد ولد أحمد",
      age: "البدريين",
      paymentMethod: "بنكيلي",
      status: "ACTIVE",
      paidAmount: 100,
      membershipYear: YEAR,
      memberNumber: "AJVT-2026-0001",
    },
  });
  await prisma.membership.create({
    data: { memberId: m.id, year: YEAR, paidAmount: 100, paymentMethod: "بنكيلي" },
  });
  await prisma.donation.create({
    data: {
      memberId: m.id,
      membershipYear: YEAR,
      source: "MEMBERSHIP",
      amount: 2000,
      status: "ACTIVE",
      donorName: "محمد ولد أحمد",
    },
  });
  return m;
}

const surplusOf = async (memberId: string) =>
  surplusForYear(
    await prisma.donation.findMany({
      where: { memberId, source: "MEMBERSHIP" },
      select: { amount: true, membershipYear: true },
    }),
    YEAR,
  );

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
      patch(`/api/admin/members/${m.id}`, {
        fullName: member.fullName,
        age: member.age,
        paymentMethod: member.paymentMethod,
        paidAmount: member.paidAmount + member.supportAmount,
      }),
      withId(m.id),
    );

    expect(await surplusOf(m.id)).toBe(2000);
    expect((await prisma.member.findUniqueOrThrow({ where: { id: m.id } })).paidAmount).toBe(100);
  });

  it("keeps the surplus when only the name is corrected", async () => {
    const m = await overpaidMember();
    const { member } = await (
      await PROFILE(get(`/api/admin/members/${m.id}/profile`), withId(m.id))
    ).json();

    await EDIT(
      patch(`/api/admin/members/${m.id}`, {
        fullName: "محمد ولد أحمدُ",
        age: member.age,
        paymentMethod: member.paymentMethod,
        paidAmount: member.paidAmount + member.supportAmount,
      }),
      withId(m.id),
    );

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

    await EDIT(patch(`/api/admin/members/${m.id}`, { paidAmount: 500 }), withId(m.id));

    expect(await surplusOf(m.id)).toBe(400);
    expect((await prisma.member.findUniqueOrThrow({ where: { id: m.id } })).paidAmount).toBe(100);
  });

  it("still lets an admin drop the surplus on purpose", async () => {
    const m = await overpaidMember();

    await EDIT(patch(`/api/admin/members/${m.id}`, { paidAmount: 100 }), withId(m.id));

    expect(await surplusOf(m.id)).toBe(0);
  });
});
