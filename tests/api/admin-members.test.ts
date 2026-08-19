import { describe, it, expect, beforeEach } from "vitest";
import { POST } from "@/app/api/admin/members/route";
import { PATCH } from "@/app/api/admin/members/[id]/route";
import { PUT as PAY } from "@/app/api/admin/members/[id]/payment/route";
import { prisma } from "@/lib/prisma";
import {
  resetDb,
  post,
  patch,
  put,
  createAdmin,
  createUser,
  signInAsAdmin,
  withId,
} from "./helpers";

const ALREADY = "لهذا الحساب عضو مسبقاً";

const validBody = {
  accountPhone: "22334455",
  fullName: "محمد ولد أحمد",
  age: "البدريين",
  paymentMethod: "بنكيلي",
  status: "ACTIVE",
  paidAmount: 1000,
};

async function signIn() {
  await signInAsAdmin(await createAdmin());
}

async function memberFor(userId: string | null, over: Record<string, unknown> = {}) {
  return prisma.member.create({
    data: {
      userId,
      fullName: "عضو",
      age: "البدريين",
      paymentMethod: "بنكيلي",
      status: "ACTIVE",
      ...over,
    },
  });
}

describe("admin membership is one per account", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("adds a member manually against a fresh phone number", async () => {
    await signIn();

    const res = await POST(post("/api/admin/members", validBody));

    expect(res.status).toBe(201);
    const created = await prisma.member.findFirstOrThrow();
    expect(created.userId).not.toBeNull();
    expect(await prisma.member.count()).toBe(1);
  });

  it("refuses a manual add onto an account that already has a member", async () => {
    await signIn();
    const user = await createUser("22334455");
    await memberFor(user.id);

    const res = await POST(post("/api/admin/members", validBody));

    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: ALREADY });
    expect(await prisma.member.count()).toBe(1);
  });

  it("attaches an account to a member added without one", async () => {
    await signIn();
    const member = await memberFor(null);

    const res = await PATCH(
      patch(`/api/admin/members/${member.id}`, { accountPhone: "22334455" }),
      withId(member.id),
    );

    expect(res.status).toBe(200);
    const updated = await prisma.member.findUniqueOrThrow({ where: { id: member.id } });
    expect(updated.userId).not.toBeNull();
  });

  it("changes the age group and the payment method, and records both", async () => {
    await signIn();
    const member = await memberFor(null, { age: "البدريين", paymentMethod: "بنكيلي" });

    const res = await PATCH(
      patch(`/api/admin/members/${member.id}`, { age: "الفائزين" }),
      withId(member.id),
    );
    await PAY(
      put(`/api/admin/members/${member.id}/payment`, {
        amountTransferred: null,
        paymentMethod: "السداد",
      }),
      withId(member.id),
    );

    expect(res.status).toBe(200);
    const updated = await prisma.member.findUniqueOrThrow({ where: { id: member.id } });
    expect(updated.age).toBe("الفائزين");
    expect(updated.paymentMethod).toBe("السداد");

    const log = await prisma.auditLog.findFirstOrThrow({
      where: { targetType: "Member", targetId: member.id, action: "UPDATE_MEMBER" },
    });
    expect(log.before).toMatchObject({ age: "البدريين" });
    expect(log.after).toMatchObject({ age: "الفائزين" });

    const paymentLog = await prisma.auditLog.findFirstOrThrow({
      where: { targetType: "Member", targetId: member.id, action: "UPDATE_MEMBER_PAYMENT" },
    });
    expect(paymentLog.adminUsername).toBe("admin");
  });

  it("leaves untouched fields alone", async () => {
    await signIn();
    const member = await memberFor(null, { age: "البدريين", paymentMethod: "بنكيلي" });

    await PATCH(patch(`/api/admin/members/${member.id}`, { age: "الفائزين" }), withId(member.id));

    const updated = await prisma.member.findUniqueOrThrow({ where: { id: member.id } });
    expect(updated.paymentMethod).toBe("بنكيلي");
    expect(updated.fullName).toBe("عضو");
  });

  it("refuses an empty payment method rather than blanking it", async () => {
    await signIn();
    const member = await memberFor(null, { paymentMethod: "بنكيلي" });

    const res = await PAY(
      put(`/api/admin/members/${member.id}/payment`, {
        amountTransferred: null,
        paymentMethod: "   ",
      }),
      withId(member.id),
    );

    expect(res.status).toBe(400);
    const untouched = await prisma.member.findUniqueOrThrow({ where: { id: member.id } });
    expect(untouched.paymentMethod).toBe("بنكيلي");
  });

  it("refuses to attach an account that already carries a member", async () => {
    await signIn();
    const taken = await createUser("22334455");
    await memberFor(taken.id);
    const orphan = await memberFor(null, { fullName: "آخر" });

    const res = await PATCH(
      patch(`/api/admin/members/${orphan.id}`, { accountPhone: "22334455" }),
      withId(orphan.id),
    );

    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: ALREADY });
    const untouched = await prisma.member.findUniqueOrThrow({ where: { id: orphan.id } });
    expect(untouched.userId).toBeNull();
  });
});
