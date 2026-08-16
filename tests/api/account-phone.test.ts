import { describe, it, expect, beforeEach } from "vitest";
import { PATCH } from "@/app/api/admin/members/[id]/account/route";
import { prisma } from "@/lib/prisma";
import { resetDb, patch, createAdmin, createUser, signInAsAdmin } from "./helpers";
import { clearCookies } from "./cookieJar";

function params(id: string) {
  return { params: Promise.resolve({ id }) };
}

async function memberOn(accountPhone: string | null, fullName = "محمد ولد أحمد") {
  const user = accountPhone ? await createUser(accountPhone) : null;
  return prisma.member.create({
    data: {
      userId: user?.id ?? null,
      fullName,
      age: "البدريين",
      paymentMethod: "بنكيلي",
      status: "ACTIVE",
    },
  });
}

function change(id: string, phone: string) {
  return PATCH(patch(`/api/admin/members/${id}/account`, { phone }), params(id));
}

describe("PATCH /api/admin/members/[id]/account", () => {
  beforeEach(async () => {
    await resetDb();
    await signInAsAdmin(await createAdmin());
  });

  it("refuses a caller who is not an admin", async () => {
    const member = await memberOn("22334455");
    clearCookies();

    expect((await change(member.id, "33445566")).status).toBe(401);
  });

  it("corrects the number the member signs in with", async () => {
    const member = await memberOn("49171404");

    const res = await change(member.id, "49171504");

    expect(res.status).toBe(200);
    const user = await prisma.user.findFirstOrThrow();
    expect(user.phone).toBe("49171504");
  });

  it("leaves the password and the session alone", async () => {
    const member = await memberOn("22334455");
    const before = await prisma.user.findFirstOrThrow();

    await change(member.id, "33445566");

    const after = await prisma.user.findFirstOrThrow();
    expect(after.password).toBe(before.password);
    expect(after.tokenVersion).toBe(before.tokenVersion);
  });

  it("records the change with both numbers", async () => {
    const member = await memberOn("22334455");

    await change(member.id, "33445566");

    const log = await prisma.auditLog.findFirstOrThrow({
      where: { action: "CHANGE_ACCOUNT_PHONE" },
    });
    expect(log.before).toMatchObject({ phone: "22334455" });
    expect(log.after).toMatchObject({ phone: "33445566" });
    expect(log.targetId).toBe(member.id);
  });

  it("refuses a number that already belongs to another account", async () => {
    await memberOn("33445566", "شخص آخر");
    const member = await memberOn("22334455");

    const res = await change(member.id, "33445566");

    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: "هذا الرقم مستعمل لحساب آخر" });
    const untouched = await prisma.user.findUniqueOrThrow({ where: { phone: "22334455" } });
    expect(untouched).toBeDefined();
  });

  it("refuses an empty account, which is what attaching is for", async () => {
    const member = await memberOn(null);

    const res = await change(member.id, "22334455");

    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: "لا يوجد حساب لهذا العضو" });
  });

  it("refuses a number that is not a number here", async () => {
    const member = await memberOn("22334455");

    for (const bad of ["123", "12345678", "2233445566", "abcdefgh"]) {
      expect((await change(member.id, bad)).status).toBe(400);
    }
    const user = await prisma.user.findFirstOrThrow();
    expect(user.phone).toBe("22334455");
  });

  it("accepts the number it already has without complaining", async () => {
    const member = await memberOn("22334455");

    const res = await change(member.id, "22334455");

    expect(res.status).toBe(200);
    expect(await prisma.auditLog.count({ where: { action: "CHANGE_ACCOUNT_PHONE" } })).toBe(0);
  });

  it("answers 404 for a member that does not exist", async () => {
    expect((await change("nope", "22334455")).status).toBe(404);
  });
});
