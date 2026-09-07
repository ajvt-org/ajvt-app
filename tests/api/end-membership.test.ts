import { describe, it, expect, beforeEach } from "vitest";
import { POST as END, DELETE as RESTORE } from "@/app/api/admin/members/[id]/end-membership/route";
import { POST as VALIDATE } from "@/app/api/admin/validate/route";
import { POST as SUBMIT } from "@/app/api/members/route";
import { prisma } from "@/lib/prisma";
import {
  resetDb,
  post,
  del,
  withId,
  createAdmin,
  createUser,
  signInAs,
  signInAsAdmin,
} from "./helpers";
import { clearCookies } from "./cookieJar";

const PAYMENT = { paymentMethod: "بنكيلي", paymentProof: "proof.webp", paidAmount: 1000 };
const REIMBURSED = "استُرجعت رسوم الانتساب";

async function asAdmin() {
  if (await prisma.admin.count()) return;
  await signInAsAdmin(await createAdmin("members-admin", "MEMBERS"));
}

async function submitted(phone?: string) {
  const user = await createUser(phone);
  await signInAs(user);
  await SUBMIT(post("/api/members", PAYMENT));
  clearCookies();
  return prisma.membership.findFirstOrThrow({ where: { userId: user.id } });
}

async function acceptedMember(phone?: string) {
  const membership = await submitted(phone);
  await asAdmin();
  await VALIDATE(post("/api/admin/validate", { id: membership.userId, action: "ACTIVE" }));
  return membership;
}

function end(userId: string, reason = REIMBURSED) {
  return END(post(`/api/admin/members/${userId}/end-membership`, { reason }), withId(userId));
}

function restore(userId: string) {
  return RESTORE(del(`/api/admin/members/${userId}/end-membership`), withId(userId));
}

describe("ending a membership", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("writes when it ended, why, and who ended it", async () => {
    const membership = await acceptedMember();

    const response = await end(membership.userId);

    expect(response.status).toBe(200);
    const row = await prisma.membership.findUniqueOrThrow({ where: { id: membership.id } });
    expect(row.endedAt).not.toBeNull();
    expect(row.endedReason).toBe(REIMBURSED);
    expect(row.endedBy).toBe("members-admin");
  });

  it("leaves the verdict on the proof exactly as it was", async () => {
    const membership = await acceptedMember();

    await end(membership.userId);

    const row = await prisma.membership.findUniqueOrThrow({ where: { id: membership.id } });
    expect(row.status).toBe("ACTIVE");
    expect(row.rejectionReason).toBeNull();
  });

  it("leaves the payment alone", async () => {
    const membership = await acceptedMember();

    await end(membership.userId);

    const payment = await prisma.payment.findFirstOrThrow({ where: { purpose: "MEMBERSHIP" } });
    expect(payment.status).toBe("ACTIVE");
  });

  it("refuses a reason a proof is turned down for", async () => {
    const membership = await acceptedMember();

    const response = await end(membership.userId, "الصورة غير واضحة");

    expect(response.status).toBe(400);
    const row = await prisma.membership.findUniqueOrThrow({ where: { id: membership.id } });
    expect(row.endedAt).toBeNull();
  });

  it("refuses a membership whose proof was never accepted", async () => {
    const membership = await submitted();
    await asAdmin();

    const response = await end(membership.userId);

    expect(response.status).toBe(409);
  });

  it("refuses to end the same membership twice", async () => {
    const membership = await acceptedMember();
    await end(membership.userId);

    const response = await end(membership.userId);

    expect(response.status).toBe(409);
  });

  it("records the act against the person", async () => {
    const membership = await acceptedMember();

    await end(membership.userId);

    const entry = await prisma.auditLog.findFirstOrThrow({ where: { action: "END_MEMBERSHIP" } });
    expect(entry.targetType).toBe("Member");
    expect(entry.targetId).toBe(membership.userId);
    expect(entry.adminUsername).toBe("members-admin");
  });

  it("reaches only the year it was asked about", async () => {
    const membership = await acceptedMember();
    const earlier = await prisma.membership.create({
      data: { userId: membership.userId, year: membership.year - 1, status: "ACTIVE" },
    });

    await end(membership.userId);

    const untouched = await prisma.membership.findUniqueOrThrow({ where: { id: earlier.id } });
    expect(untouched.endedAt).toBeNull();
  });
});

describe("restoring a membership ended in error", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("clears the three columns and leaves the year alone", async () => {
    const membership = await acceptedMember();
    await end(membership.userId);

    const response = await restore(membership.userId);

    expect(response.status).toBe(200);
    const row = await prisma.membership.findUniqueOrThrow({ where: { id: membership.id } });
    expect(row.endedAt).toBeNull();
    expect(row.endedReason).toBeNull();
    expect(row.endedBy).toBeNull();
    expect(row.year).toBe(membership.year);
  });

  it("has nothing to restore on a membership that still stands", async () => {
    const membership = await acceptedMember();

    const response = await restore(membership.userId);

    expect(response.status).toBe(409);
  });

  it("records the act against the person", async () => {
    const membership = await acceptedMember();
    await end(membership.userId);

    await restore(membership.userId);

    const entry = await prisma.auditLog.findFirstOrThrow({
      where: { action: "RESTORE_MEMBERSHIP" },
    });
    expect(entry.targetId).toBe(membership.userId);
  });
});
