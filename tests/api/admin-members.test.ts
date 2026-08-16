import { describe, it, expect, beforeEach } from "vitest";
import { POST } from "@/app/api/admin/members/route";
import { PATCH } from "@/app/api/admin/members/[id]/route";
import { prisma } from "@/lib/prisma";
import { resetDb, post, patch, createAdmin, createUser, signInAsAdmin } from "./helpers";

const ALREADY = "لهذا الحساب عضو مسبقاً";

const validBody = {
  accountPhone: "22334455",
  fullName: "محمد ولد أحمد",
  memberPhone: "22334455",
  age: "البدريين",
  paymentMethod: "بنكيلي",
  status: "ACTIVE",
  paidAmount: 1000,
};

function params(id: string) {
  return { params: Promise.resolve({ id }) };
}

async function signIn() {
  await signInAsAdmin(await createAdmin());
}

async function memberFor(userId: string | null, over: Record<string, unknown> = {}) {
  return prisma.member.create({
    data: {
      userId,
      fullName: "عضو",
      phone: "22334455",
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
    const member = await memberFor(null, { phone: null });

    const res = await PATCH(
      patch(`/api/admin/members/${member.id}`, { accountPhone: "22334455" }),
      params(member.id),
    );

    expect(res.status).toBe(200);
    const updated = await prisma.member.findUniqueOrThrow({ where: { id: member.id } });
    expect(updated.userId).not.toBeNull();
  });

  it("changes the age group and the payment method, and records both", async () => {
    await signIn();
    const member = await memberFor(null, { age: "البدريين", paymentMethod: "بنكيلي" });

    const res = await PATCH(
      patch(`/api/admin/members/${member.id}`, {
        age: "الفائزين",
        paymentMethod: "السداد",
      }),
      params(member.id),
    );

    expect(res.status).toBe(200);
    const updated = await prisma.member.findUniqueOrThrow({ where: { id: member.id } });
    expect(updated.age).toBe("الفائزين");
    expect(updated.paymentMethod).toBe("السداد");

    const log = await prisma.auditLog.findFirstOrThrow({
      where: { targetType: "Member", targetId: member.id, action: "UPDATE_MEMBER" },
    });
    expect(log.before).toMatchObject({ age: "البدريين", paymentMethod: "بنكيلي" });
    expect(log.after).toMatchObject({ age: "الفائزين", paymentMethod: "السداد" });
  });

  it("leaves untouched fields alone", async () => {
    await signIn();
    const member = await memberFor(null, { age: "البدريين", paymentMethod: "بنكيلي" });

    await PATCH(patch(`/api/admin/members/${member.id}`, { age: "الفائزين" }), params(member.id));

    const updated = await prisma.member.findUniqueOrThrow({ where: { id: member.id } });
    expect(updated.paymentMethod).toBe("بنكيلي");
    expect(updated.fullName).toBe("عضو");
  });

  it("refuses an empty payment method rather than blanking it", async () => {
    await signIn();
    const member = await memberFor(null, { paymentMethod: "بنكيلي" });

    const res = await PATCH(
      patch(`/api/admin/members/${member.id}`, { paymentMethod: "   " }),
      params(member.id),
    );

    expect(res.status).toBe(400);
    const untouched = await prisma.member.findUniqueOrThrow({ where: { id: member.id } });
    expect(untouched.paymentMethod).toBe("بنكيلي");
  });

  it("refuses to attach an account that already carries a member", async () => {
    await signIn();
    const taken = await createUser("22334455");
    await memberFor(taken.id);
    const orphan = await memberFor(null, { phone: null, fullName: "آخر" });

    const res = await PATCH(
      patch(`/api/admin/members/${orphan.id}`, { accountPhone: "22334455" }),
      params(orphan.id),
    );

    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: ALREADY });
    const untouched = await prisma.member.findUniqueOrThrow({ where: { id: orphan.id } });
    expect(untouched.userId).toBeNull();
  });
});
