import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { POST as REGISTER } from "@/app/api/members/route";
import { PATCH as SELF_PATCH } from "@/app/api/members/[id]/route";
import { POST as VALIDATE } from "@/app/api/admin/validate/route";
import { POST as RENEW } from "@/app/api/admin/members/[id]/renew/route";
import { PUT as EDIT_PAYMENT } from "@/app/api/admin/members/[id]/payment/route";
import { saveAppSettings } from "@/lib/settingsServer";
import {
  resetDb,
  post,
  patch,
  put,
  createUser,
  createAdmin,
  signInAs,
  signInAsAdmin,
  withId,
  adminAddsMember,
} from "./helpers";

const submission = {
  fullName: "محمد ولد أحمد",
  age: "البدريين",
  paymentMethod: "بنكيلي",
  paymentProof: "proof.webp",
  paidAmount: 100,
};

async function currentRecord(memberId: string) {
  const member = await prisma.member.findUniqueOrThrow({ where: { id: memberId } });
  const record = await prisma.membership.findUniqueOrThrow({
    where: { memberId_year: { memberId, year: member.membershipYear } },
  });
  return { member, record };
}

async function expectNoDrift(memberId: string) {
  const { member, record } = await currentRecord(memberId);
  expect(record.status).toBe(member.status);
  expect(record.rejectionReason).toBe(member.rejectionReason);
  expect(record.paidAmount).toBe(member.paidAmount);
  expect(record.paymentMethod).toBe(member.paymentMethod);
  expect(record.referenceCode).toBe(member.referenceCode);
  expect(record.surplusAnonymous).toBe(member.surplusAnonymous);
}

async function submitAs(body: Record<string, unknown> = {}) {
  await signInAs(await createUser());
  await REGISTER(post("/api/members", { ...submission, ...body }));
  return prisma.member.findFirstOrThrow();
}

describe("the membership year record follows the member it belongs to", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("matches after the member sends their request", async () => {
    const member = await submitAs();

    await expectNoDrift(member.id);
  });

  it("matches after the member corrects and resends it", async () => {
    const member = await submitAs();

    await REGISTER(
      post("/api/members", {
        ...submission,
        id: member.id,
        paidAmount: 500,
        paymentMethod: "السداد",
      }),
    );

    await expectNoDrift(member.id);
    expect((await currentRecord(member.id)).record.paymentMethod).toBe("السداد");
  });

  it("matches after an admin approves", async () => {
    const member = await submitAs();
    await signInAsAdmin(await createAdmin());

    await VALIDATE(post("/api/admin/validate", { id: member.id, action: "ACTIVE" }));

    await expectNoDrift(member.id);
  });

  it("matches after an admin refuses the payment", async () => {
    const member = await submitAs();
    await signInAsAdmin(await createAdmin());

    await VALIDATE(
      post("/api/admin/validate", {
        id: member.id,
        action: "REJECTED",
        rejectionReason: "المبلغ المدفوع غير مطابق",
      }),
    );

    await expectNoDrift(member.id);
  });

  it("matches after a refusal is overturned", async () => {
    const member = await submitAs();
    await signInAsAdmin(await createAdmin());
    await VALIDATE(
      post("/api/admin/validate", {
        id: member.id,
        action: "REJECTED",
        rejectionReason: "الصورة غير واضحة",
      }),
    );

    await VALIDATE(post("/api/admin/validate", { id: member.id, action: "ACTIVE" }));

    await expectNoDrift(member.id);
    expect((await currentRecord(member.id)).record.rejectionReason).toBeNull();
  });

  it("matches after an admin edits what was paid", async () => {
    const member = await submitAs();
    await signInAsAdmin(await createAdmin());

    await EDIT_PAYMENT(
      put(`/api/admin/members/${member.id}/payment`, { amountTransferred: 700 }),
      withId(member.id),
    );

    await expectNoDrift(member.id);
  });

  it("matches after the member hides their name on the support board", async () => {
    const member = await submitAs({ paidAmount: 2100 });

    await SELF_PATCH(
      patch(`/api/members/${member.id}`, { surplusAnonymous: true }),
      withId(member.id),
    );

    await expectNoDrift(member.id);
    expect((await currentRecord(member.id)).record.surplusAnonymous).toBe(true);
  });

  it("matches for a member an admin adds by hand", async () => {
    await signInAsAdmin(await createAdmin());

    await adminAddsMember({
      fullName: "أحمد ولد سالم",
      age: "البدريين",
      paymentMethod: "نقداً",
      phoneUnknown: true,
      status: "ACTIVE",
      paidAmount: 300,
    });

    await expectNoDrift((await prisma.member.findFirstOrThrow()).id);
  });

  it("opens a fresh record for the year a renewal covers, leaving the old one alone", async () => {
    const member = await submitAs();
    await signInAsAdmin(await createAdmin());
    await VALIDATE(post("/api/admin/validate", { id: member.id, action: "ACTIVE" }));
    const firstYear = member.membershipYear;
    await saveAppSettings({ membershipYear: firstYear + 1 });

    await RENEW(
      post(`/api/admin/members/${member.id}/renew`, {
        paidAmount: 100,
        paymentMethod: "بنكيلي",
      }),
      withId(member.id),
    );

    const records = await prisma.membership.findMany({
      where: { memberId: member.id },
      orderBy: { year: "asc" },
    });
    expect(records.map((r) => [r.year, r.status])).toEqual([
      [firstYear, "ACTIVE"],
      [firstYear + 1, "ACTIVE"],
    ]);
    await expectNoDrift(member.id);
  });

  it("never leaves a member without a record for the year they are on", async () => {
    await submitAs();
    await signInAsAdmin(await createAdmin());
    await adminAddsMember({
      fullName: "أحمد ولد سالم",
      age: "البدريين",
      paymentMethod: "نقداً",
      phoneUnknown: true,
      status: "PENDING",
    });

    const members = await prisma.member.findMany();
    for (const member of members) {
      const record = await prisma.membership.findUnique({
        where: { memberId_year: { memberId: member.id, year: member.membershipYear } },
      });
      expect(record).not.toBeNull();
    }
  });
});
