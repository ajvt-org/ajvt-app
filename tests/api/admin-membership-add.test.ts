import { describe, it, expect, beforeEach } from "vitest";
import { POST } from "@/app/api/admin/people/[id]/membership/route";
import { POST as ADD_PERSON } from "@/app/api/admin/people/route";
import { prisma } from "@/lib/prisma";
import { resetDb, post, createAdmin, signInAsAdmin, withId } from "./helpers";
import { getAppSettings } from "@/lib/settingsServer";

const PAYMENT = { paymentMethod: "بنكيلي", paidAmount: 100, status: "PENDING" };

async function asMembersAdmin() {
  await signInAsAdmin(await createAdmin("members-admin", "MEMBERS"));
}

async function person(phone: string | null = "36000123") {
  await ADD_PERSON(
    post("/api/admin/people", {
      accountPhone: phone,
      phoneUnknown: phone === null,
      fullName: "محمد ولد أحمد",
      age: "البدريين",
      village: "التاكلالت",
    }),
  );
  return prisma.user.findFirstOrThrow({ where: { fullName: "محمد ولد أحمد" } });
}

function add(id: string, body: unknown = PAYMENT) {
  return POST(post(`/api/admin/people/${id}/membership`, body), withId(id));
}

describe("POST /api/admin/people/[id]/membership", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("refuses an anonymous caller", async () => {
    await asMembersAdmin();
    const target = await person();
    await resetDb();

    expect((await add(target.id)).status).toBe(401);
  });

  it("refuses an admin scoped to another section", async () => {
    await asMembersAdmin();
    const target = await person();
    await signInAsAdmin(await createAdmin("activities-admin", "ACTIVITIES"));

    expect((await add(target.id)).status).toBe(403);
  });

  it("answers 404 for a person who does not exist", async () => {
    await asMembersAdmin();

    expect((await add("missing")).status).toBe(404);
  });

  it("adds a payment to a person created earlier", async () => {
    await asMembersAdmin();
    const target = await person();

    const res = await add(target.id);

    expect(res.status).toBe(201);
    const member = await prisma.member.findFirstOrThrow();
    expect(member.userId).toBe(target.id);
    expect((await prisma.membership.findFirstOrThrow()).status).toBe("PENDING");
  });

  it("adds a payment to a person who has no number", async () => {
    await asMembersAdmin();
    const target = await person(null);

    expect((await add(target.id)).status).toBe(201);
    expect(await prisma.member.count()).toBe(1);
  });

  it("refuses a second payment on the same account", async () => {
    await asMembersAdmin();
    const target = await person();
    await add(target.id);

    const res = await add(target.id);

    expect(res.status).toBe(409);
    expect(await prisma.member.count()).toBe(1);
  });

  it("issues a membership number when the payment is accepted", async () => {
    await asMembersAdmin();
    const target = await person();

    await add(target.id, { ...PAYMENT, status: "ACTIVE" });

    const after = await prisma.user.findUniqueOrThrow({ where: { id: target.id } });
    expect(after.memberNumber).toBeTruthy();
    expect(after.verifyToken).toBeTruthy();
  });

  it("issues no number while the payment waits for review", async () => {
    await asMembersAdmin();
    const target = await person();

    await add(target.id);

    const after = await prisma.user.findUniqueOrThrow({ where: { id: target.id } });
    expect(after.memberNumber).toBeNull();
  });

  it("keeps the number a returning member already had", async () => {
    await asMembersAdmin();
    const target = await person();
    await prisma.user.update({
      where: { id: target.id },
      data: { memberNumber: "AJVT-2020-0007", verifyToken: "kept" },
    });

    await add(target.id, { ...PAYMENT, status: "ACTIVE" });

    const after = await prisma.user.findUniqueOrThrow({ where: { id: target.id } });
    expect(after.memberNumber).toBe("AJVT-2020-0007");
  });

  it("records the year with the payment's own status", async () => {
    await asMembersAdmin();
    const waiting = await person();
    await add(waiting.id);

    const { membershipYear } = await getAppSettings();
    const pending = await prisma.membership.findFirstOrThrow();
    expect(pending).toMatchObject({ year: membershipYear, status: "PENDING" });

    await resetDb();
    await asMembersAdmin();
    const accepted = await person();
    await add(accepted.id, { ...PAYMENT, status: "ACTIVE" });

    const active = await prisma.membership.findFirstOrThrow();
    expect(active).toMatchObject({ year: membershipYear, status: "ACTIVE" });
  });

  it("refuses an amount below the fee", async () => {
    await asMembersAdmin();
    const target = await person();

    expect((await add(target.id, { ...PAYMENT, paidAmount: 5 })).status).toBe(400);
    expect(await prisma.member.count()).toBe(0);
  });

  it("refuses a status the admin may not set", async () => {
    await asMembersAdmin();
    const target = await person();

    expect((await add(target.id, { ...PAYMENT, status: "REJECTED" })).status).toBe(400);
  });

  it("writes the payment into the audit log", async () => {
    await asMembersAdmin();
    const target = await person();

    await add(target.id);

    const entry = await prisma.auditLog.findFirstOrThrow({ where: { action: "ADD_MEMBERSHIP" } });
    expect(entry.targetLabel).toBe("محمد ولد أحمد");
  });
});
