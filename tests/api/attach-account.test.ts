import { describe, it, expect, beforeEach } from "vitest";
import * as bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { PATCH } from "@/app/api/admin/members/[id]/route";
import { POST as LOGIN } from "@/app/api/auth/login/route";
import {
  resetDb,
  patch,
  post,
  createUser,
  createAdmin,
  signInAsAdmin,
  withId,
  makeMember,
} from "./helpers";

async function personWithNoAccount(fullName = "أحمد ولد سالم") {
  return makeMember({
    user: { create: { fullName, memberNumber: "AJVT-2026-0007", verifyToken: "tok-7" } },
    fullName,
    age: "البدريين",
    paymentMethod: "نقداً",
    status: "ACTIVE",
    memberNumber: "AJVT-2026-0007",
    verifyToken: "tok-7",
  });
}

async function attach(memberId: string, phone: string) {
  return PATCH(patch(`/api/admin/members/${memberId}`, { accountPhone: phone }), withId(memberId));
}

describe("attaching an account to someone an admin added", () => {
  beforeEach(async () => {
    await resetDb();
    await signInAsAdmin(await createAdmin());
  });

  it("fills in the credentials on the person's own account", async () => {
    const member = await personWithNoAccount();

    const res = await attach(member.userId, "22119911");

    expect(res.status).toBe(200);
    const after = await prisma.member.findUniqueOrThrow({ where: { id: member.id } });
    expect(after.userId).toBe(member.userId);
    const account = await prisma.user.findUniqueOrThrow({ where: { id: after.userId } });
    expect(account.phone).toBe("22119911");
    expect(account.password).not.toBeNull();
  });

  it("hands back a temporary password the person can sign in with", async () => {
    const member = await personWithNoAccount();

    const body = await (await attach(member.userId, "22119911")).json();

    expect(body.tempPassword).toBeTruthy();
    const account = await prisma.user.findFirstOrThrow({ where: { phone: "22119911" } });
    expect(await bcrypt.compare(body.tempPassword, account.password as string)).toBe(true);
  });

  it("keeps the person on the account they already signed up with", async () => {
    const existing = await createUser("22119911", "secret");
    const member = await personWithNoAccount();
    const placeholder = member.userId;

    const res = await attach(member.userId, "22119911");

    expect(res.status).toBe(200);
    const after = await prisma.member.findUniqueOrThrow({ where: { id: member.id } });
    expect(after.userId).toBe(existing.id);
    expect(await prisma.user.findUnique({ where: { id: placeholder } })).toBeNull();
  });

  it("moves the person onto that account rather than losing them", async () => {
    await createUser("22119911", "secret");
    const member = await personWithNoAccount();

    await attach(member.userId, "22119911");

    const account = await prisma.user.findFirstOrThrow({ where: { phone: "22119911" } });
    expect(account.fullName).toBe("أحمد ولد سالم");
    expect(account.memberNumber).toBe("AJVT-2026-0007");
    expect(account.verifyToken).toBe("tok-7");
  });

  it("leaves the password on an account that already had one", async () => {
    await createUser("22119911", "secret");
    const member = await personWithNoAccount();

    await attach(member.userId, "22119911");

    const res = await LOGIN(post("/api/auth/login", { phone: "22119911", password: "secret" }));
    expect(res.status).toBe(200);
  });

  it("refuses a number that already carries a member", async () => {
    const taken = await createUser("22119911", "secret");
    await makeMember({
      userId: taken.id,
      fullName: "آخر",
      age: "البدريين",
      paymentMethod: "نقداً",
    });
    const member = await personWithNoAccount();

    const res = await attach(member.userId, "22119911");

    expect(res.status).toBe(409);
    expect((await prisma.member.findUniqueOrThrow({ where: { id: member.id } })).userId).toBe(
      member.userId,
    );
  });

  it("refuses to attach a second number to someone who already has one", async () => {
    const owner = await createUser("22119900", "secret");
    const member = await makeMember({
      userId: owner.id,
      fullName: "محمد",
      age: "البدريين",
      paymentMethod: "نقداً",
    });

    const res = await attach(member.userId, "22119911");

    expect(res.status).toBe(400);
  });

  it("refuses a number that is not a real one", async () => {
    const member = await personWithNoAccount();

    const res = await attach(member.userId, "123");

    expect(res.status).toBe(400);
    expect(
      (await prisma.user.findUniqueOrThrow({ where: { id: member.userId } })).phone,
    ).toBeNull();
  });
});
