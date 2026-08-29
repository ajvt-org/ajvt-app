import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { saveAppSettings } from "@/lib/settingsServer";
import {
  resetDb,
  post,
  createUser,
  createAdmin,
  signInAs,
  signInAsAdmin,
  adminAddsMember,
} from "./helpers";

import { POST as REGISTER } from "@/app/api/members/route";
import { POST as VALIDATE } from "@/app/api/admin/validate/route";

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

describe("the year record a membership request opens", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("opens as soon as the member asks, waiting on a decision", async () => {
    const member = await submitAs();

    const record = await prisma.membership.findFirstOrThrow({ where: { memberId: member.id } });
    expect(record.year).toBe(member.membershipYear);
    expect(record.status).toBe("PENDING");
    expect(record.reviewedBy).toBeNull();
  });

  it("carries what the member sent with the request", async () => {
    const member = await submitAs();

    const record = await prisma.membership.findFirstOrThrow({ where: { memberId: member.id } });
    expect(record.paidAmount).toBe(100);
    expect(record.paymentMethod).toBe("بنكيلي");
    expect(record.paymentProof).toBe("proof.webp");
  });

  it("is stamped the moment an admin approves", async () => {
    const member = await submitAs();
    await signInAsAdmin(await createAdmin());

    await VALIDATE(post("/api/admin/validate", { id: member.id, action: "ACTIVE" }));

    const record = await prisma.membership.findFirstOrThrow({ where: { memberId: member.id } });
    expect(record.year).toBe(member.membershipYear);
    expect(record.status).toBe("ACTIVE");
    expect(record.paidAmount).toBe(100);
    expect(record.paymentMethod).toBe("بنكيلي");
    expect(record.recordedBy).toBe("admin");
    expect(record.reviewedBy).toBe("admin");
    expect(record.reviewedAt).not.toBeNull();
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

  it("carries the refusal and its reason when the payment is turned down", async () => {
    const member = await submitAs();
    await signInAsAdmin(await createAdmin());

    await VALIDATE(
      post("/api/admin/validate", {
        id: member.id,
        action: "REJECTED",
        rejectionReason: "الصورة غير واضحة",
      }),
    );

    const record = await prisma.membership.findFirstOrThrow({ where: { memberId: member.id } });
    expect(record.status).toBe("REJECTED");
    expect(record.rejectionReason).toBe("الصورة غير واضحة");
    expect(record.reviewedBy).toBe("admin");
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

    await adminAddsMember({
      fullName: "أحمد ولد سالم",
      age: "البدريين",
      paymentMethod: "نقداً",
      phoneUnknown: true,
      status: "ACTIVE",
      paidAmount: 300,
    });

    const member = await prisma.member.findFirstOrThrow();
    const record = await prisma.membership.findFirstOrThrow({ where: { memberId: member.id } });
    expect(record.paidAmount).toBe(100);
    expect(record.year).toBe(member.membershipYear);
  });

  it("waits on a decision for a member an admin adds as still waiting", async () => {
    await signInAsAdmin(await createAdmin());

    await adminAddsMember({
      fullName: "أحمد ولد سالم",
      age: "البدريين",
      paymentMethod: "نقداً",
      phoneUnknown: true,
      status: "PENDING",
    });

    const record = await prisma.membership.findFirstOrThrow();
    expect(record.status).toBe("PENDING");
    expect(record.reviewedBy).toBeNull();
  });
});
