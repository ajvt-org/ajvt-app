import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { saveAppSettings } from "@/lib/settingsServer";
import { resetDb, post, createUser, createAdmin, signInAs, signInAsAdmin } from "./helpers";

import { POST as REGISTER } from "@/app/api/members/route";
import { POST as VALIDATE } from "@/app/api/admin/validate/route";
import { POST as ADMIN_ADD } from "@/app/api/admin/members/route";

const submission = {
  fullName: "محمد ولد أحمد",
  age: "البدريين",
  paymentMethod: "بنكيلي",
  paymentProof: "proof.webp",
  paidAmount: 100,
};

async function submitAs(body: Record<string, unknown> = {}) {
  await signInAs(await createUser());
  await REGISTER(post("/api/members", { ...submission, ...body }));
  return prisma.member.findFirstOrThrow();
}

describe("the year record written when a membership is approved", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("does not exist while the membership is still waiting", async () => {
    const member = await submitAs();

    expect(await prisma.membership.count({ where: { memberId: member.id } })).toBe(0);
  });

  it("is written the moment an admin approves", async () => {
    const member = await submitAs();
    await signInAsAdmin(await createAdmin());

    await VALIDATE(post("/api/admin/validate", { id: member.id, action: "ACTIVE" }));

    const record = await prisma.membership.findFirstOrThrow({ where: { memberId: member.id } });
    expect(record.year).toBe(member.membershipYear);
    expect(record.paidAmount).toBe(100);
    expect(record.paymentMethod).toBe("بنكيلي");
    expect(record.recordedBy).toBe("admin");
  });

  it("keeps only the fee when the member paid more", async () => {
    const member = await submitAs({ paidAmount: 2100 });
    await signInAsAdmin(await createAdmin());

    await VALIDATE(post("/api/admin/validate", { id: member.id, action: "ACTIVE" }));

    const record = await prisma.membership.findFirstOrThrow({ where: { memberId: member.id } });
    expect(record.paidAmount).toBe(100);
  });

  it("follows the fee the association set rather than a built-in one", async () => {
    await saveAppSettings({ membershipFee: 250 });
    const member = await submitAs({ paidAmount: 900 });
    await signInAsAdmin(await createAdmin());

    await VALIDATE(post("/api/admin/validate", { id: member.id, action: "ACTIVE" }));

    const record = await prisma.membership.findFirstOrThrow({ where: { memberId: member.id } });
    expect(record.paidAmount).toBe(250);
  });

  it("is not written when the membership is refused", async () => {
    const member = await submitAs();
    await signInAsAdmin(await createAdmin());

    await VALIDATE(
      post("/api/admin/validate", {
        id: member.id,
        action: "REJECTED",
        rejectionReason: "إثبات الدفع غير واضح",
      }),
    );

    expect(await prisma.membership.count({ where: { memberId: member.id } })).toBe(0);
  });

  it("survives a second approval without changing what was banked", async () => {
    const member = await submitAs();
    await signInAsAdmin(await createAdmin());
    const validate = () =>
      VALIDATE(post("/api/admin/validate", { id: member.id, action: "ACTIVE" }));

    await validate();
    await prisma.member.update({ where: { id: member.id }, data: { paidAmount: 5000 } });
    await validate();

    const records = await prisma.membership.findMany({ where: { memberId: member.id } });
    expect(records).toHaveLength(1);
    expect(records[0].paidAmount).toBe(100);
  });

  it("is written for a member an admin adds as already active", async () => {
    await signInAsAdmin(await createAdmin());

    await ADMIN_ADD(
      post("/api/admin/members", {
        fullName: "أحمد ولد سالم",
        age: "البدريين",
        paymentMethod: "نقداً",
        phoneUnknown: true,
        status: "ACTIVE",
        paidAmount: 300,
      }),
    );

    const member = await prisma.member.findFirstOrThrow();
    const record = await prisma.membership.findFirstOrThrow({ where: { memberId: member.id } });
    expect(record.paidAmount).toBe(100);
    expect(record.year).toBe(member.membershipYear);
  });

  it("is not written for a member an admin adds as still waiting", async () => {
    await signInAsAdmin(await createAdmin());

    await ADMIN_ADD(
      post("/api/admin/members", {
        fullName: "أحمد ولد سالم",
        age: "البدريين",
        paymentMethod: "نقداً",
        phoneUnknown: true,
        status: "PENDING",
      }),
    );

    expect(await prisma.membership.count()).toBe(0);
  });
});
