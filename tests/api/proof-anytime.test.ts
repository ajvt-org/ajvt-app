import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { PUT as PAY } from "@/app/api/admin/members/[id]/payment/route";
import { resetDb, put, createAdmin, signInAsAdmin, withId, adminAddsMember } from "./helpers";

const manual = {
  accountPhone: "22334455",
  fullName: "محمد ولد أحمد",
  age: "البدريين",
  paymentMethod: "بنكيلي",
  status: "ACTIVE",
  paidAmount: 1000,
};

async function addedByHand(over: Record<string, unknown> = {}) {
  await adminAddsMember({ ...manual, ...over });
  return prisma.member.findFirstOrThrow();
}

function pay(id: string, body: Record<string, unknown>) {
  return PAY(put(`/api/admin/members/${id}/payment`, body), withId(id));
}

function recordOf(memberId: string, year: number) {
  return prisma.membership.findFirstOrThrow({
    where: { user: { members: { some: { id: memberId } } }, year },
  });
}

describe("a proof added after the member was registered", () => {
  beforeEach(async () => {
    await resetDb();
    await signInAsAdmin(await createAdmin());
  });

  it("lands on the membership and on the year record", async () => {
    const member = await addedByHand();

    const res = await pay(member.id, { paymentProof: "late.webp" });

    expect(res.status).toBe(200);
    const after = await prisma.member.findUniqueOrThrow({ where: { id: member.id } });
    expect(after.paymentProof).toBe("late.webp");
    expect((await recordOf(member.id, member.membershipYear)).paymentProof).toBe("late.webp");
  });

  it("leaves the amount alone when only the proof is sent", async () => {
    const member = await addedByHand();
    const before = await prisma.member.findUniqueOrThrow({ where: { id: member.id } });

    const body = await (await pay(member.id, { paymentProof: "late.webp" })).json();

    expect(body.amountTransferred).toBe(1000);
    const after = await prisma.member.findUniqueOrThrow({ where: { id: member.id } });
    expect(after.paidAmount).toBe(before.paidAmount);
    expect((await recordOf(member.id, member.membershipYear)).paidAmount).toBe(before.paidAmount);
  });

  it("replaces a proof that was already there", async () => {
    const member = await addedByHand({ paymentProof: "first.webp" });

    await pay(member.id, { paymentProof: "second.webp" });

    const after = await prisma.member.findUniqueOrThrow({ where: { id: member.id } });
    expect(after.paymentProof).toBe("second.webp");
    expect((await recordOf(member.id, member.membershipYear)).paymentProof).toBe("second.webp");
  });

  it("clears the proof when it is sent as nothing", async () => {
    const member = await addedByHand({ paymentProof: "first.webp" });

    await pay(member.id, { paymentProof: null });

    const after = await prisma.member.findUniqueOrThrow({ where: { id: member.id } });
    expect(after.paymentProof).toBeNull();
  });

  it("records the proof in the audit trail", async () => {
    const member = await addedByHand();

    await pay(member.id, { paymentProof: "late.webp" });

    const entry = await prisma.auditLog.findFirstOrThrow({
      where: { action: "UPDATE_MEMBER_PAYMENT", targetId: member.id },
      orderBy: { createdAt: "desc" },
    });
    expect(JSON.stringify(entry.after)).toContain("late.webp");
  });

  it("still takes an amount and a proof together", async () => {
    const member = await addedByHand();

    const body = await (
      await pay(member.id, { amountTransferred: 2000, paymentProof: "late.webp" })
    ).json();

    expect(body.amountTransferred).toBe(2000);
    const after = await prisma.member.findUniqueOrThrow({ where: { id: member.id } });
    expect(after.paymentProof).toBe("late.webp");
  });

  it("still clears the amount when it is sent as nothing", async () => {
    const member = await addedByHand();

    await pay(member.id, { amountTransferred: null });

    const after = await prisma.member.findUniqueOrThrow({ where: { id: member.id } });
    expect(after.paidAmount).toBeNull();
  });

  it("refuses an amount under the fee", async () => {
    const member = await addedByHand();

    expect((await pay(member.id, { amountTransferred: 1 })).status).toBe(400);
  });

  it("is closed to a member that does not exist", async () => {
    expect((await pay("nobody", { paymentProof: "late.webp" })).status).toBe(404);
  });
});
