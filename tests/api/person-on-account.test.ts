import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { POST as REGISTER } from "@/app/api/members/route";
import { POST as VALIDATE } from "@/app/api/admin/validate/route";
import { PATCH as ADMIN_EDIT } from "@/app/api/admin/members/[id]/route";
import { POST as LOGIN } from "@/app/api/auth/login/route";
import { HOME_VILLAGE } from "@/lib/villages";
import {
  resetDb,
  post,
  patch,
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

async function expectNoDrift(memberId: string) {
  const member = await prisma.member.findUniqueOrThrow({ where: { id: memberId } });
  const account = await prisma.user.findUniqueOrThrow({ where: { id: member.userId } });
  const current = await prisma.membership.findFirstOrThrow({
    where: { userId: member.userId },
    orderBy: { year: "desc" },
  });
  expect(account.fullName?.trim()).toBeTruthy();
  expect(account.village).toBeTruthy();
  if (current.status === "ACTIVE") {
    expect(account.memberNumber).toBeTruthy();
    expect(account.verifyToken).toBeTruthy();
  }
}

async function submitAs(body: Record<string, unknown> = {}) {
  await signInAs(await createUser());
  await REGISTER(post("/api/members", { ...submission, ...body }));
  return prisma.member.findFirstOrThrow();
}

describe("the account carries the person", () => {
  beforeEach(async () => {
    await resetDb();
    await prisma.village.create({ data: { name: HOME_VILLAGE } });
    await prisma.village.create({ data: { name: "أفجار" } });
  });

  it("copies the person onto the account when they send their request", async () => {
    const member = await submitAs();

    await expectNoDrift(member.id);
    const account = await prisma.user.findUniqueOrThrow({ where: { id: member.userId } });
    expect(account.fullName).toBe("محمد ولد أحمد");
  });

  it("follows a correction the member makes", async () => {
    const member = await submitAs();

    await REGISTER(
      post("/api/members", { ...submission, id: member.id, village: "أفجار", age: null }),
    );

    await expectNoDrift(member.id);
  });

  it("follows a correction an admin makes", async () => {
    const member = await submitAs();
    await signInAsAdmin(await createAdmin());

    await ADMIN_EDIT(
      patch(`/api/admin/members/${member.id}`, { fullName: "أحمد ولد محمد" }),
      withId(member.id),
    );

    await expectNoDrift(member.id);
  });

  it("carries the number the card is built from once the payment is approved", async () => {
    const member = await submitAs();
    await signInAsAdmin(await createAdmin());

    await VALIDATE(post("/api/admin/validate", { id: member.id, action: "ACTIVE" }));

    await expectNoDrift(member.id);
    const account = await prisma.user.findUniqueOrThrow({ where: { id: member.userId } });
    expect(account.memberNumber).not.toBeNull();
    expect(account.verifyToken).not.toBeNull();
  });

  it("gives a person an admin adds by hand an account of their own", async () => {
    await signInAsAdmin(await createAdmin());

    await adminAddsMember({
      fullName: "أحمد ولد سالم",
      age: "البدريين",
      paymentMethod: "نقداً",
      phoneUnknown: true,
      status: "ACTIVE",
    });

    const member = await prisma.member.findFirstOrThrow();
    await expectNoDrift(member.id);
    const account = await prisma.user.findUniqueOrThrow({ where: { id: member.userId } });
    expect(account.phone).toBeNull();
    expect(account.password).toBeNull();
  });

  it("leaves no member without an account", async () => {
    await submitAs();
    await signInAsAdmin(await createAdmin());
    await adminAddsMember({
      fullName: "أحمد ولد سالم",
      age: "البدريين",
      paymentMethod: "نقداً",
      phoneUnknown: true,
      status: "PENDING",
    });

    for (const member of await prisma.member.findMany()) {
      expect(member.userId).toBeTruthy();
      await expectNoDrift(member.id);
    }
  });
});

describe("an account with no credentials cannot be signed in to", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("refuses a password against an account that has none", async () => {
    await prisma.user.create({ data: { phone: "22119911", fullName: "أحمد" } });

    const res = await LOGIN(post("/api/auth/login", { phone: "22119911", password: "anything" }));

    expect(res.status).toBe(401);
  });

  it("still lets a real account in", async () => {
    await createUser("22119912", "secret");

    const res = await LOGIN(post("/api/auth/login", { phone: "22119912", password: "secret" }));

    expect(res.status).toBe(200);
  });
});
