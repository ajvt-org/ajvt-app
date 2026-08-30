import { describe, it, expect, beforeEach } from "vitest";
import { POST } from "@/app/api/members/route";
import { prisma } from "@/lib/prisma";
import { resetDb, post, createUser, signInAs, personFor } from "./helpers";
import { saveAppSettings } from "@/lib/settingsServer";

const validBody = {
  fullName: "محمد ولد أحمد",
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
    expect((await prisma.membership.findFirstOrThrow()).status).toBe("PENDING");
    expect(member?.userId).toBe(user.id);
    expect((await personFor(member!.id)).memberNumber).toBeNull();
  });

  it("ignores a number the client sends, since the account carries it", async () => {
    const user = await createUser("33445566");
    await signInAs(user);

    const res = await POST(post("/api/members", { ...validBody, phone: "22119988" }));

    expect(res.status).toBe(201);
    const member = await prisma.member.findFirstOrThrow({ include: { user: true } });
    expect(member.user?.phone).toBe("33445566");
  });

  it("refuses a session whose tokenVersion is stale", async () => {
    const user = await createUser();
    await signInAs(user);
    await prisma.user.update({ where: { id: user.id }, data: { tokenVersion: { increment: 1 } } });

    const res = await POST(post("/api/members", validBody));

    expect(res.status).toBe(401);
    expect(await prisma.member.count()).toBe(0);
  });

  it("requires the fields the form requires, with the same message as before", async () => {
    const user = await createUser();
    await signInAs(user);

    const expected: Record<string, string> = {
      paymentMethod: "يرجى اختيار طريقة الدفع",
      paymentProof: "يرجى إرفاق صورة الكابتير",
    };

    for (const [field, message] of Object.entries(expected)) {
      const res = await POST(post("/api/members", { ...validBody, [field]: undefined }));
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ error: message });
    }
    expect(await prisma.member.count()).toBe(0);
  });

  it("keeps the exact wording of the length and amount errors", async () => {
    const user = await createUser();
    await signInAs(user);

    const cases: [Record<string, unknown>, string][] = [
      [{ paidAmount: 10 }, "يرجى إدخال مبلغ صحيح (100 أوقية على الأقل)"],
      [{ referenceCode: "nope" }, "بيانات غير صالحة"],
    ];

    for (const [patch, message] of cases) {
      const res = await POST(post("/api/members", { ...validBody, ...patch }));
      expect(res.status).toBe(400);
      expect(await res.json()).toEqual({ error: message });
    }
  });

  it("rejects an amount below the membership fee", async () => {
    const user = await createUser();
    await signInAs(user);

    const res = await POST(post("/api/members", { ...validBody, paidAmount: 10 }));

    expect(res.status).toBe(400);
  });

  it("enforces the fee the association set, not the one in the code", async () => {
    await saveAppSettings({ membershipFee: 500 });
    const user = await createUser();
    await signInAs(user);

    const tooLow = await POST(post("/api/members", { ...validBody, paidAmount: 300 }));
    expect(tooLow.status).toBe(400);
    expect(await tooLow.json()).toEqual({ error: "يرجى إدخال مبلغ صحيح (500 أوقية على الأقل)" });

    const enough = await POST(post("/api/members", { ...validBody, paidAmount: 500 }));
    expect(enough.status).toBe(201);
  });

  it("still accepts 100 when the association has not changed anything", async () => {
    const user = await createUser();
    await signInAs(user);

    const res = await POST(post("/api/members", { ...validBody, paidAmount: 100 }));

    expect(res.status).toBe(201);
  });

  it("lets the owner fix a pending submission", async () => {
    const user = await createUser();
    await signInAs(user);
    await POST(post("/api/members", validBody));
    const member = await prisma.member.findFirstOrThrow();

    const res = await POST(
      post("/api/members", { ...validBody, id: member.userId, paymentMethod: "السداد" }),
    );

    expect(res.status).toBe(200);
    const updated = await prisma.membership.findFirstOrThrow();
    expect(updated.paymentMethod).toBe("السداد");
    expect(await prisma.membership.count()).toBe(1);
  });

  it("leaves the person alone, since the payment screen never asks for them", async () => {
    const user = await createUser();
    await signInAs(user);
    await POST(post("/api/members", validBody));
    const member = await prisma.member.findFirstOrThrow();

    await POST(post("/api/members", { ...validBody, id: member.userId, fullName: "اسم آخر" }));

    expect((await personFor(member.id)).fullName).toBe("محمد ولد أحمد");
  });

  it("refuses a payment from an account with no name yet", async () => {
    const user = await createUser("22119933");
    await prisma.user.update({ where: { id: user.id }, data: { fullName: null } });
    await signInAs(user);

    const res = await POST(post("/api/members", validBody));

    expect(res.status).toBe(400);
    expect(await prisma.member.count()).toBe(0);
  });

  it("will not let one user edit another user's member", async () => {
    const owner = await createUser("22334455");
    await signInAs(owner);
    await POST(post("/api/members", validBody));
    const member = await prisma.member.findFirstOrThrow();

    const attacker = await createUser("33445566");
    await signInAs(attacker);
    const res = await POST(
      post("/api/members", { ...validBody, id: member.userId, fullName: "مخترق" }),
    );

    expect(res.status).toBe(404);
    const untouched = await personFor(member.id);
    expect(untouched.fullName).toBe(validBody.fullName);
  });

  it("refuses a second form on an account that already has one", async () => {
    const user = await createUser();
    await signInAs(user);
    await POST(post("/api/members", validBody));

    const res = await POST(post("/api/members", { ...validBody, fullName: "اسم آخر" }));

    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({
      error: "لديك طلب انضمام بالفعل، يمكنك تعديله بدل إرسال طلب جديد",
    });
    expect(await prisma.member.count()).toBe(1);
  });

  it("refuses a second form even after the first was rejected", async () => {
    const user = await createUser();
    await signInAs(user);
    await POST(post("/api/members", validBody));
    await prisma.membership.updateMany({
      where: { userId: user.id },
      data: { status: "REJECTED", rejectionReason: "معلومات ناقصة أو غير صحيحة" },
    });

    const res = await POST(post("/api/members", validBody));

    expect(res.status).toBe(409);
    expect(await prisma.member.count()).toBe(1);
  });

  it("lets a rejected member fix the form they already have", async () => {
    const user = await createUser();
    await signInAs(user);
    await POST(post("/api/members", validBody));
    const member = await prisma.member.findFirstOrThrow();
    await prisma.membership.updateMany({
      where: { userId: member.userId },
      data: { status: "REJECTED", rejectionReason: "الصورة غير واضحة" },
    });

    const res = await POST(
      post("/api/members", { ...validBody, id: member.userId, paymentProof: "better.webp" }),
    );

    expect(res.status).toBe(200);
    const updated = await prisma.membership.findFirstOrThrow({ where: { userId: member.userId } });
    expect(updated.status).toBe("PENDING");
    expect(updated.rejectionReason).toBeNull();
    expect(updated.paymentProof).toBe("better.webp");
    expect(await prisma.membership.count()).toBe(1);
  });

  it("will not reopen a member who is already approved", async () => {
    const user = await createUser();
    await signInAs(user);
    await POST(post("/api/members", validBody));
    const member = await prisma.member.findFirstOrThrow();
    await prisma.membership.updateMany({
      where: { userId: member.userId },
      data: { status: "ACTIVE" },
    });

    const res = await POST(post("/api/members", { ...validBody, id: member.userId }));

    expect(res.status).toBe(409);
  });

  it("keeps the code the member wrote on their transfer", async () => {
    const user = await createUser();
    await signInAs(user);

    const res = await POST(post("/api/members", { ...validBody, referenceCode: "AJ-ABCDE" }));

    expect(res.status).toBe(201);
    expect((await res.json()).referenceCode).toBe("AJ-ABCDE");
  });

  it("hands out a different code instead of dead-ending on a collision", async () => {
    const first = await createUser("22334455");
    await signInAs(first);
    await POST(post("/api/members", { ...validBody, referenceCode: "AJ-ABCDE" }));

    const second = await createUser("33445566");
    await signInAs(second);
    const res = await POST(post("/api/members", { ...validBody, referenceCode: "AJ-ABCDE" }));

    expect(res.status).toBe(201);
    const { referenceCode } = await res.json();
    expect(referenceCode).not.toBe("AJ-ABCDE");
    expect(referenceCode).toMatch(/^AJ-[23456789A-HJKMNP-Z]{5}$/);
    expect(await prisma.member.count()).toBe(2);
  });

  it("refuses a code the client invented in the wrong shape", async () => {
    const user = await createUser();
    await signInAs(user);

    for (const bad of ["hello", "AJ-abcde", "AJ-ABC", "AJ-ABCDEF", "AJ-A1CDE", "XX-ABCDE"]) {
      expect((await POST(post("/api/members", { ...validBody, referenceCode: bad }))).status).toBe(
        400,
      );
    }
    expect(await prisma.member.count()).toBe(0);
  });

  it("still allows a submission with no code at all", async () => {
    const user = await createUser();
    await signInAs(user);

    const res = await POST(post("/api/members", validBody));

    expect(res.status).toBe(201);
    expect((await res.json()).referenceCode).toBeNull();
  });
});
