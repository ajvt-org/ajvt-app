import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { saveAppSettings } from "@/lib/settingsServer";
import { runningYear } from "@/lib/membershipYear";
import { MEMBERSHIP_FEE } from "@/lib/donations";
import {
  resetDb,
  get,
  post,
  createAdmin,
  signInAsAdmin,
  withId,
  personFor,
  makeMember,
} from "./helpers";

import { POST as RENEW } from "@/app/api/admin/members/[id]/renew/route";
import { GET as LIST_YEARS } from "@/app/api/admin/members/[id]/memberships/route";

const YEAR = runningYear();
const LAST = YEAR - 1;

const payment = { paidAmount: 1000, paymentMethod: "بنكيلي" };

function member(over: Record<string, unknown> = {}) {
  const { userId, ...rest } = over;
  return makeMember({
    ...(userId ? { userId: userId as string } : { user: { create: {} } }),
    fullName: "محمد ولد أحمد",
    age: "البدريين",
    paymentMethod: "بنكيلي",
    status: "ACTIVE",
    paidAmount: 500,
    membershipYear: LAST,
    memberNumber: "AJVT-2025-0001",
    ...rest,
  });
}

const renew = (id: string, body: unknown = payment) =>
  RENEW(post(`/api/admin/members/${id}/renew`, body), withId(id));

const YEARS = (id: string) => LIST_YEARS(get(`/api/admin/members/${id}/memberships`), withId(id));

describe("renewing a membership", () => {
  beforeEach(async () => {
    await resetDb();
    await saveAppSettings({ membershipYear: YEAR, membershipFee: 100 });
    await signInAsAdmin(await createAdmin("boss", "SUPER"));
  });

  it("moves the member onto the running year without touching their number", async () => {
    const existing = await member();

    const res = await renew(existing.id);

    expect(res.status).toBe(201);
    const after = await prisma.member.findUniqueOrThrow({ where: { id: existing.id } });
    expect(after.membershipYear).toBe(YEAR);
    expect((await personFor(existing.id)).memberNumber).toBe("AJVT-2025-0001");
    expect(after.paidAmount).toBe(100);
  });

  it("leaves the previous year readable beside the new one", async () => {
    const existing = await member();
    await prisma.membership.create({
      data: { memberId: existing.id, year: LAST, paidAmount: 500, paymentMethod: "بنكيلي" },
    });

    await renew(existing.id);

    const years = await prisma.membership.findMany({
      where: { memberId: existing.id },
      orderBy: { year: "asc" },
    });
    expect(years.map((m) => m.year)).toEqual([LAST, YEAR]);
    expect(years.map((m) => m.paidAmount)).toEqual([500, 100]);
  });

  it("records who took the payment", async () => {
    const existing = await member();

    await renew(existing.id);

    const latest = await prisma.membership.findFirstOrThrow({ where: { year: YEAR } });
    expect(latest.recordedBy).toBe("boss");
  });

  it("keeps the account attached, which a second registration would not", async () => {
    const user = await prisma.user.create({ data: { phone: "22334455", password: "x" } });
    const existing = await member({ userId: user.id });

    await renew(existing.id);

    expect(await prisma.member.count()).toBe(1);
    expect((await prisma.member.findUniqueOrThrow({ where: { id: existing.id } })).userId).toBe(
      user.id,
    );
  });

  it("refuses a second renewal for the same year and writes nothing", async () => {
    const existing = await member({ membershipYear: YEAR });

    const res = await renew(existing.id);

    expect(res.status).toBe(409);
    expect(await prisma.membership.count()).toBe(0);
  });

  it("refuses a member who was never accepted", async () => {
    const existing = await member({ status: "PENDING", memberNumber: null });

    expect((await renew(existing.id)).status).toBe(409);
  });

  it("refuses an amount below the fee the association set", async () => {
    await saveAppSettings({ membershipFee: 2000 });
    const existing = await member();

    const res = await renew(existing.id);

    expect(res.status).toBe(400);
    expect(await prisma.membership.count()).toBe(0);
  });

  it("refuses a payment method that is not one of the accepted ones", async () => {
    const existing = await member();

    const res = await renew(existing.id, { ...payment, paymentMethod: "بيتكوين" });

    expect(res.status).toBe(400);
  });

  it("is closed to an admin without the members section", async () => {
    const existing = await member();
    await signInAsAdmin(await createAdmin("quiz", "QUIZ"));

    expect((await renew(existing.id)).status).toBe(403);
  });

  it("counts the surplus over the fee as support, as a first payment does", async () => {
    const existing = await member();

    await renew(existing.id, { ...payment, paidAmount: 1000 });

    const donation = await prisma.donation.findFirstOrThrow({
      where: { memberId: existing.id, source: "MEMBERSHIP" },
    });
    expect(donation.amount).toBe(1000 - MEMBERSHIP_FEE);
  });
});

describe("reading a member's years", () => {
  beforeEach(async () => {
    await resetDb();
    await saveAppSettings({ membershipYear: YEAR, membershipFee: 100 });
    await signInAsAdmin(await createAdmin("boss", "SUPER"));
  });

  it("lists the years newest first, with who took each payment", async () => {
    const existing = await member();
    await prisma.membership.create({
      data: { memberId: existing.id, year: LAST, paidAmount: 500 },
    });
    await renew(existing.id);

    const { memberships } = await (await YEARS(existing.id)).json();

    expect(memberships.map((m: { year: number }) => m.year)).toEqual([YEAR, LAST]);
    expect(memberships[0].recordedBy).toBe("boss");
    expect(memberships[1].recordedBy).toBeNull();
  });

  it("says why a member cannot be renewed, so the panel need not guess", async () => {
    const owing = await member();
    const done = await member({ membershipYear: YEAR, memberNumber: "AJVT-2026-0002" });
    const pending = await member({ status: "PENDING", memberNumber: null });

    expect((await (await YEARS(owing.id)).json()).refusal).toBeNull();
    expect((await (await YEARS(done.id)).json()).refusal).toBe("alreadyRenewed");
    expect((await (await YEARS(pending.id)).json()).refusal).toBe("notActive");
  });

  it("is closed to an admin without the members section", async () => {
    const existing = await member();
    await signInAsAdmin(await createAdmin("quiz", "QUIZ"));

    expect((await YEARS(existing.id)).status).toBe(403);
  });
});
