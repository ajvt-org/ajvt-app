import { describe, it, expect, beforeEach } from "vitest";
import { PATCH } from "@/app/api/admin/members/[id]/route";
import { prisma } from "@/lib/prisma";
import { HOME_VILLAGE, OTHER_VILLAGE } from "@/lib/villages";
import { resetDb, patch, createAdmin, signInAsAdmin, withId } from "./helpers";

async function aMember(over: { village?: string; age?: string | null } = {}) {
  return prisma.member.create({
    data: {
      fullName: "محمد ولد أحمد",
      paymentMethod: "بنكيلي",
      village: over.village ?? HOME_VILLAGE,
      age: over.age === undefined ? "البدريين" : over.age,
    },
  });
}

describe("PATCH /api/admin/members/[id] — the village", () => {
  beforeEach(async () => {
    await resetDb();
    await prisma.village.create({ data: { name: HOME_VILLAGE } });
    await prisma.village.create({ data: { name: "أفجار" } });
  });

  it("refuses an anonymous caller", async () => {
    const member = await aMember();

    const res = await PATCH(
      patch(`/api/admin/members/${member.id}`, { village: "أفجار" }),
      withId(member.id),
    );

    expect(res.status).toBe(401);
    expect((await prisma.member.findUniqueOrThrow({ where: { id: member.id } })).village).toBe(
      HOME_VILLAGE,
    );
  });

  it("moves a member to a neighbouring village and drops their age group", async () => {
    await signInAsAdmin(await createAdmin());
    const member = await aMember();

    const res = await PATCH(
      patch(`/api/admin/members/${member.id}`, { village: "أفجار" }),
      withId(member.id),
    );

    expect(res.status).toBe(200);
    const after = await prisma.member.findUniqueOrThrow({ where: { id: member.id } });
    expect(after.village).toBe("أفجار");
    expect(after.age).toBeNull();
  });

  it("corrects a member who picked the other option", async () => {
    await signInAsAdmin(await createAdmin());
    const member = await aMember({ village: OTHER_VILLAGE, age: null });

    const res = await PATCH(
      patch(`/api/admin/members/${member.id}`, { village: "أفجار" }),
      withId(member.id),
    );

    expect(res.status).toBe(200);
    expect((await prisma.member.findUniqueOrThrow({ where: { id: member.id } })).village).toBe(
      "أفجار",
    );
  });

  it("brings a member back to the home village with an age group", async () => {
    await signInAsAdmin(await createAdmin());
    const member = await aMember({ village: "أفجار", age: null });

    const res = await PATCH(
      patch(`/api/admin/members/${member.id}`, { village: HOME_VILLAGE, age: "المجاهدين" }),
      withId(member.id),
    );

    expect(res.status).toBe(200);
    const after = await prisma.member.findUniqueOrThrow({ where: { id: member.id } });
    expect(after.village).toBe(HOME_VILLAGE);
    expect(after.age).toBe("المجاهدين");
  });

  it("refuses to move a member to the home village with no age group", async () => {
    await signInAsAdmin(await createAdmin());
    const member = await aMember({ village: "أفجار", age: null });

    const res = await PATCH(
      patch(`/api/admin/members/${member.id}`, { village: HOME_VILLAGE }),
      withId(member.id),
    );

    expect(res.status).toBe(400);
    expect((await prisma.member.findUniqueOrThrow({ where: { id: member.id } })).village).toBe(
      "أفجار",
    );
  });

  it("refuses to clear the age group of a member of the home village", async () => {
    await signInAsAdmin(await createAdmin());
    const member = await aMember();

    const res = await PATCH(
      patch(`/api/admin/members/${member.id}`, { age: "" }),
      withId(member.id),
    );

    expect(res.status).toBe(400);
    expect((await prisma.member.findUniqueOrThrow({ where: { id: member.id } })).age).toBe(
      "البدريين",
    );
  });

  it("refuses a village that is not on the managed list", async () => {
    await signInAsAdmin(await createAdmin());
    const member = await aMember();

    const res = await PATCH(
      patch(`/api/admin/members/${member.id}`, { village: "بوتلميت" }),
      withId(member.id),
    );

    expect(res.status).toBe(400);
    expect((await prisma.member.findUniqueOrThrow({ where: { id: member.id } })).village).toBe(
      HOME_VILLAGE,
    );
  });

  it("leaves the village alone when only the name is corrected", async () => {
    await signInAsAdmin(await createAdmin());
    const member = await aMember({ village: "أفجار", age: null });

    await PATCH(patch(`/api/admin/members/${member.id}`, { fullName: "أحمد" }), withId(member.id));

    const after = await prisma.member.findUniqueOrThrow({ where: { id: member.id } });
    expect(after.village).toBe("أفجار");
    expect(after.age).toBeNull();
  });

  it("records the village in the audit trail", async () => {
    await signInAsAdmin(await createAdmin());
    const member = await aMember();

    await PATCH(patch(`/api/admin/members/${member.id}`, { village: "أفجار" }), withId(member.id));

    const entry = await prisma.auditLog.findFirstOrThrow({ where: { action: "UPDATE_MEMBER" } });
    expect(entry.after).toMatchObject({ village: "أفجار" });
  });
});
