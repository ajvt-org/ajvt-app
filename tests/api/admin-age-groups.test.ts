import { describe, it, expect, beforeEach } from "vitest";
import { PATCH, DELETE } from "@/app/api/admin/age-groups/[id]/route";
import { prisma } from "@/lib/prisma";
import { resetDb, post, createAdmin, signInAsAdmin } from "./helpers";

function withId(id: string, body: unknown) {
  return [post(`/api/admin/age-groups/${id}`, body), { params: Promise.resolve({ id }) }] as const;
}

async function aMember(fullName: string, age: string) {
  return prisma.member.create({
    data: { fullName, age, paymentMethod: "بنكيلي", phone: null },
  });
}

describe("PATCH /api/admin/age-groups/[id]", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("refuses an anonymous caller", async () => {
    const group = await prisma.ageGroup.create({ data: { name: "المنصورين" } });

    const res = await PATCH(...withId(group.id, { name: "المنصورون" }));

    expect(res.status).toBe(401);
    expect((await prisma.ageGroup.findUniqueOrThrow({ where: { id: group.id } })).name).toBe(
      "المنصورين",
    );
  });

  it("renames every member carrying the old name", async () => {
    await signInAsAdmin(await createAdmin());
    const group = await prisma.ageGroup.create({ data: { name: "المنصورين" } });
    await aMember("محمد", "المنصورين");
    await aMember("أحمد", "المنصورين");
    await aMember("سالم", "المبشرين");

    const res = await PATCH(...withId(group.id, { name: "المنصورون" }));

    expect(res.status).toBe(200);
    expect(await prisma.member.count({ where: { age: "المنصورون" } })).toBe(2);
    expect(await prisma.member.count({ where: { age: "المنصورين" } })).toBe(0);
    expect(await prisma.member.count({ where: { age: "المبشرين" } })).toBe(1);
  });

  it("records how many members moved", async () => {
    await signInAsAdmin(await createAdmin());
    const group = await prisma.ageGroup.create({ data: { name: "المنصورين" } });
    await aMember("محمد", "المنصورين");

    await PATCH(...withId(group.id, { name: "المنصورون" }));

    const entry = await prisma.auditLog.findFirstOrThrow({ where: { action: "UPDATE_AGE_GROUP" } });
    expect(entry.targetType).toBe("AgeGroup");
    expect(entry.targetId).toBe(group.id);
    expect(entry.before).toEqual({ name: "المنصورين" });
    expect(entry.after).toEqual({ name: "المنصورون" });
    expect(entry.meta).toEqual({ membersRenamed: 1 });
  });

  it("leaves members alone when the new name is taken", async () => {
    await signInAsAdmin(await createAdmin());
    const group = await prisma.ageGroup.create({ data: { name: "المنصورين" } });
    await prisma.ageGroup.create({ data: { name: "المبشرين" } });
    await aMember("محمد", "المنصورين");

    const res = await PATCH(...withId(group.id, { name: "المبشرين" }));

    expect(res.status).toBe(409);
    expect(await prisma.member.count({ where: { age: "المنصورين" } })).toBe(1);
  });
});

describe("DELETE /api/admin/age-groups/[id]", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("keeps the members that were in the deleted group", async () => {
    await signInAsAdmin(await createAdmin());
    const group = await prisma.ageGroup.create({ data: { name: "المنصورين" } });
    await aMember("محمد", "المنصورين");

    const res = await DELETE(...withId(group.id, {}));

    expect(res.status).toBe(200);
    expect(await prisma.member.count({ where: { age: "المنصورين" } })).toBe(1);
  });
});
