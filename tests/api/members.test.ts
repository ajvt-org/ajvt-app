import { describe, it, expect, beforeEach } from "vitest";
import { POST } from "@/app/api/members/route";
import { prisma } from "@/lib/prisma";
import { resetDb, post, createUser, signInAs } from "./helpers";

const validBody = {
  fullName: "محمد ولد أحمد",
  phone: "22334455",
  age: "البدريين",
  paymentMethod: "بنكيلي",
  paymentProof: "proof.webp",
  paidAmount: 1000,
};

describe("POST /api/members", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("refuses an anonymous caller", async () => {
    const res = await POST(post("/api/members", validBody));

    expect(res.status).toBe(401);
    expect(await prisma.member.count()).toBe(0);
  });

  it("creates a pending member for the signed-in user", async () => {
    const user = await createUser();
    await signInAs(user);

    const res = await POST(post("/api/members", validBody));

    expect(res.status).toBe(201);
    const member = await prisma.member.findFirst();
    expect(member?.status).toBe("PENDING");
    expect(member?.userId).toBe(user.id);
    expect(member?.memberNumber).toBeNull();
  });

  it("refuses a session whose tokenVersion is stale", async () => {
    const user = await createUser();
    await signInAs(user);
    await prisma.user.update({ where: { id: user.id }, data: { tokenVersion: { increment: 1 } } });

    const res = await POST(post("/api/members", validBody));

    expect(res.status).toBe(401);
    expect(await prisma.member.count()).toBe(0);
  });

  it("requires the fields the form requires", async () => {
    const user = await createUser();
    await signInAs(user);

    for (const field of ["fullName", "phone", "age", "paymentMethod", "paymentProof"]) {
      const body = { ...validBody, [field]: undefined };
      expect((await POST(post("/api/members", body))).status).toBe(400);
    }
    expect(await prisma.member.count()).toBe(0);
  });

  it("rejects an amount below the membership fee", async () => {
    const user = await createUser();
    await signInAs(user);

    const res = await POST(post("/api/members", { ...validBody, paidAmount: 10 }));

    expect(res.status).toBe(400);
  });

  it("lets the owner fix a pending submission", async () => {
    const user = await createUser();
    await signInAs(user);
    await POST(post("/api/members", validBody));
    const member = await prisma.member.findFirstOrThrow();

    const res = await POST(
      post("/api/members", { ...validBody, id: member.id, fullName: "اسم آخر" }),
    );

    expect(res.status).toBe(200);
    const updated = await prisma.member.findUniqueOrThrow({ where: { id: member.id } });
    expect(updated.fullName).toBe("اسم آخر");
    expect(await prisma.member.count()).toBe(1);
  });

  it("will not let one user edit another user's member", async () => {
    const owner = await createUser("22334455");
    await signInAs(owner);
    await POST(post("/api/members", validBody));
    const member = await prisma.member.findFirstOrThrow();

    const attacker = await createUser("33445566");
    await signInAs(attacker);
    const res = await POST(
      post("/api/members", { ...validBody, id: member.id, fullName: "مخترق" }),
    );

    expect(res.status).toBe(404);
    const untouched = await prisma.member.findUniqueOrThrow({ where: { id: member.id } });
    expect(untouched.fullName).toBe(validBody.fullName);
  });

  it("will not reopen a member who is already approved", async () => {
    const user = await createUser();
    await signInAs(user);
    await POST(post("/api/members", validBody));
    const member = await prisma.member.findFirstOrThrow();
    await prisma.member.update({ where: { id: member.id }, data: { status: "ACTIVE" } });

    const res = await POST(post("/api/members", { ...validBody, id: member.id }));

    expect(res.status).toBe(409);
  });

  it("answers 409 when the reference code is already taken", async () => {
    const first = await createUser("22334455");
    await signInAs(first);
    await POST(post("/api/members", { ...validBody, referenceCode: "AJ-ABCDE" }));

    const second = await createUser("33445566");
    await signInAs(second);
    const res = await POST(post("/api/members", { ...validBody, referenceCode: "AJ-ABCDE" }));

    expect(res.status).toBe(409);
  });
});
