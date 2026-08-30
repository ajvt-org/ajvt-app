import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { POST as REGISTER } from "@/app/api/members/route";
import { PATCH as SELF_PATCH } from "@/app/api/members/[id]/route";
import { POST as VALIDATE } from "@/app/api/admin/validate/route";
import { POST as RENEW } from "@/app/api/admin/members/[id]/renew/route";
import { PUT as EDIT_PAYMENT } from "@/app/api/admin/members/[id]/payment/route";
import { saveAppSettings } from "@/lib/settingsServer";
import { runningYear } from "@/lib/membershipYear";
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
  const record = await prisma.membership.findFirstOrThrow({
    where: { userId: member.userId },
    orderBy: { year: "desc" },
  });
  return { member, record };
}

async function expectRecorded(memberId: string, expected: Record<string, unknown>) {
  const { record } = await currentRecord(memberId);
  expect(record).toMatchObject(expected);
}

async function submitAs(body: Record<string, unknown> = {}) {
  await signInAs(await createUser());
  await REGISTER(post("/api/members", { ...submission, ...body }));
  return prisma.member.findFirstOrThrow();
}

describe("the membership year record after each way it is written", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("holds what the member sent", async () => {
    const member = await submitAs();

    await expectRecorded(member.id, {
      status: "PENDING",
      paymentMethod: "بنكيلي",
      paymentProof: "proof.webp",
    });
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

    await expectRecorded(member.id, { status: "PENDING", paymentMethod: "السداد" });
  });

  it("matches after an admin approves", async () => {
    const member = await submitAs();
    await signInAsAdmin(await createAdmin());

    await VALIDATE(post("/api/admin/validate", { id: member.id, action: "ACTIVE" }));

    await expectRecorded(member.id, { status: "ACTIVE", rejectionReason: null });
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

    await expectRecorded(member.id, {
      status: "REJECTED",
      rejectionReason: "المبلغ المدفوع غير مطابق",
    });
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

    await expectRecorded(member.id, { status: "ACTIVE", rejectionReason: null });
  });

  it("matches after an admin edits what was paid", async () => {
    const member = await submitAs();
    await signInAsAdmin(await createAdmin());

    await EDIT_PAYMENT(
      put(`/api/admin/members/${member.id}/payment`, { amountTransferred: 700 }),
      withId(member.id),
    );

    await expectRecorded(member.id, { status: "PENDING", paymentMethod: "بنكيلي" });
  });

  it("matches after the member hides their name on the support board", async () => {
    const member = await submitAs({ paidAmount: 2100 });

    await SELF_PATCH(
      patch(`/api/members/${member.id}`, { surplusAnonymous: true }),
      withId(member.id),
    );

    const payment = await prisma.payment.findFirstOrThrow({
      where: { userId: member.userId, purpose: "MEMBERSHIP" },
    });
    expect(payment.anonymous).toBe(true);
    expect(payment.donorName).toBeNull();
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

    await expectRecorded((await prisma.member.findFirstOrThrow()).id, {
      status: "ACTIVE",
      paymentMethod: "نقداً",
    });
  });

  it("opens a fresh record for the year a renewal covers, leaving the old one alone", async () => {
    const member = await submitAs();
    await signInAsAdmin(await createAdmin());
    await VALIDATE(post("/api/admin/validate", { id: member.id, action: "ACTIVE" }));
    const firstYear = runningYear();
    await saveAppSettings({ membershipYear: firstYear + 1 });

    await RENEW(
      post(`/api/admin/members/${member.id}/renew`, {
        paidAmount: 100,
        paymentMethod: "بنكيلي",
      }),
      withId(member.id),
    );

    const records = await prisma.membership.findMany({
      where: { userId: member.userId },
      orderBy: { year: "asc" },
    });
    expect(records.map((r) => [r.year, r.status])).toEqual([
      [firstYear, "ACTIVE"],
      [firstYear + 1, "ACTIVE"],
    ]);
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
      const record = await prisma.membership.findFirst({ where: { userId: member.userId } });
      expect(record).not.toBeNull();
    }
  });
});
