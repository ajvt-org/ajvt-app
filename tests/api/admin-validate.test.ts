import { describe, it, expect, beforeEach } from "vitest";
import { POST } from "@/app/api/admin/validate/route";
import { prisma } from "@/lib/prisma";
import { resetDb, post, createAdmin, createUser, signInAsAdmin } from "./helpers";

async function pendingMember() {
  const user = await createUser();
  return prisma.member.create({
    data: {
      userId: user.id,
      fullName: "محمد ولد أحمد",
      phone: user.phone,
      age: "البدريين",
      paymentMethod: "بنكيلي",
      paidAmount: 1000,
      status: "PENDING",
    },
  });
}

describe("POST /api/admin/validate", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("refuses an anonymous caller", async () => {
    const member = await pendingMember();

    const res = await POST(post("/api/admin/validate", { id: member.id, action: "ACTIVE" }));

    expect(res.status).toBe(401);
    const after = await prisma.member.findUniqueOrThrow({ where: { id: member.id } });
    expect(after.status).toBe("PENDING");
  });

  it("refuses an admin scoped to another section", async () => {
    const member = await pendingMember();
    await signInAsAdmin(await createAdmin("activities-admin", "ACTIVITIES"));

    const res = await POST(post("/api/admin/validate", { id: member.id, action: "ACTIVE" }));

    expect(res.status).toBe(403);
    const after = await prisma.member.findUniqueOrThrow({ where: { id: member.id } });
    expect(after.status).toBe("PENDING");
  });

  it("lets the members admin approve, and assigns a member number", async () => {
    const member = await pendingMember();
    await signInAsAdmin(await createAdmin("members-admin", "MEMBERS"));

    const res = await POST(post("/api/admin/validate", { id: member.id, action: "ACTIVE" }));

    expect(res.status).toBe(200);
    const after = await prisma.member.findUniqueOrThrow({ where: { id: member.id } });
    expect(after.status).toBe("ACTIVE");
    expect(after.memberNumber).toMatch(/^AJVT-\d{4}-\d{4}$/);
  });

  it("lets a SUPER admin through as well", async () => {
    const member = await pendingMember();
    await signInAsAdmin(await createAdmin("super-admin", "SUPER"));

    expect(
      (await POST(post("/api/admin/validate", { id: member.id, action: "ACTIVE" }))).status,
    ).toBe(200);
  });

  it("hands out member numbers in sequence and never reuses one", async () => {
    await signInAsAdmin(await createAdmin("members-admin", "MEMBERS"));
    const first = await pendingMember();
    const second = await prisma.member.create({
      data: {
        fullName: "أحمد ولد سيدي",
        age: "الفائزين",
        paymentMethod: "السداد",
        status: "PENDING",
      },
    });

    await POST(post("/api/admin/validate", { id: first.id, action: "ACTIVE" }));
    await POST(post("/api/admin/validate", { id: second.id, action: "ACTIVE" }));

    const numbers = (await prisma.member.findMany({ select: { memberNumber: true } }))
      .map((m) => m.memberNumber)
      .filter(Boolean);
    expect(new Set(numbers).size).toBe(2);
  });

  it("keeps the member number when a member is approved twice", async () => {
    const member = await pendingMember();
    await signInAsAdmin(await createAdmin("members-admin", "MEMBERS"));

    await POST(post("/api/admin/validate", { id: member.id, action: "ACTIVE" }));
    const first = await prisma.member.findUniqueOrThrow({ where: { id: member.id } });
    await POST(post("/api/admin/validate", { id: member.id, action: "ACTIVE" }));
    const second = await prisma.member.findUniqueOrThrow({ where: { id: member.id } });

    expect(second.memberNumber).toBe(first.memberNumber);
  });

  it("stores a rejection reason from the fixed list", async () => {
    const member = await pendingMember();
    await signInAsAdmin(await createAdmin("members-admin", "MEMBERS"));

    const res = await POST(
      post("/api/admin/validate", {
        id: member.id,
        action: "REJECTED",
        rejectionReason: "الصورة غير واضحة",
      }),
    );

    expect(res.status).toBe(200);
    const after = await prisma.member.findUniqueOrThrow({ where: { id: member.id } });
    expect(after.status).toBe("REJECTED");
    expect(after.rejectionReason).toBe("الصورة غير واضحة");
  });

  it("refuses a rejection reason that is not on the list", async () => {
    const member = await pendingMember();
    await signInAsAdmin(await createAdmin("members-admin", "MEMBERS"));

    const res = await POST(
      post("/api/admin/validate", {
        id: member.id,
        action: "REJECTED",
        rejectionReason: "whatever the client felt like sending",
      }),
    );

    expect(res.status).toBe(400);
    const after = await prisma.member.findUniqueOrThrow({ where: { id: member.id } });
    expect(after.status).toBe("PENDING");
  });

  it("clears a stale rejection reason once the member is approved", async () => {
    const member = await pendingMember();
    await signInAsAdmin(await createAdmin("members-admin", "MEMBERS"));

    await POST(
      post("/api/admin/validate", {
        id: member.id,
        action: "REJECTED",
        rejectionReason: "طلب مكرر",
      }),
    );
    await POST(post("/api/admin/validate", { id: member.id, action: "ACTIVE" }));

    const after = await prisma.member.findUniqueOrThrow({ where: { id: member.id } });
    expect(after.rejectionReason).toBeNull();
  });

  it("rejects an unknown action", async () => {
    const member = await pendingMember();
    await signInAsAdmin(await createAdmin("members-admin", "MEMBERS"));

    expect(
      (await POST(post("/api/admin/validate", { id: member.id, action: "DELETED" }))).status,
    ).toBe(400);
  });
});
