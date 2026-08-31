import { describe, it, expect, beforeEach } from "vitest";
import { PATCH, DELETE } from "@/app/api/admin/age-groups/[id]/route";
import { prisma } from "@/lib/prisma";
import {
  resetDb,
  post,
  createAdmin,
  signInAsAdmin,
  withId,
  personFor,
  makeMember,
} from "./helpers";

async function aMember(fullName: string, age: string) {
  return makeMember({ user: { create: {} }, fullName, age, paymentMethod: "بنكيلي" });
}

describe("PATCH /api/admin/age-groups/[id]", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("refuses an anonymous caller", async () => {
    const group = await prisma.ageGroup.create({ data: { name: "المنصورين" } });

    const res = await PATCH(
      post(`/api/admin/age-groups/${group.id}`, { name: "المنصورون" }),
      withId(group.id),
    );

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

    const res = await PATCH(
      post(`/api/admin/age-groups/${group.id}`, { name: "المنصورون" }),
      withId(group.id),
    );

    expect(res.status).toBe(200);
    expect(await prisma.membership.count({ where: { user: { age: "المنصورون" } } })).toBe(2);
    expect(await prisma.membership.count({ where: { user: { age: "المنصورين" } } })).toBe(0);
    expect(await prisma.membership.count({ where: { user: { age: "المبشرين" } } })).toBe(1);
  });

  it("records how many members moved", async () => {
    await signInAsAdmin(await createAdmin());
    const group = await prisma.ageGroup.create({ data: { name: "المنصورين" } });
    await aMember("محمد", "المنصورين");

    await PATCH(post(`/api/admin/age-groups/${group.id}`, { name: "المنصورون" }), withId(group.id));

    const entry = await prisma.auditLog.findFirstOrThrow({ where: { action: "UPDATE_AGE_GROUP" } });
    expect(entry.targetType).toBe("AgeGroup");
    expect(entry.targetId).toBe(group.id);
    expect(entry.before).toEqual({ name: "المنصورين" });
    expect(entry.after).toEqual({ name: "المنصورون" });
    expect(entry.meta).toEqual({ membersRenamed: 1 });
  });

  it("does not touch updatedAt, the member page reads it as their decision date", async () => {
    await signInAsAdmin(await createAdmin());
    const group = await prisma.ageGroup.create({ data: { name: "المنصورين" } });
    const member = await aMember("محمد", "المنصورين");
    const before = (await personFor(member.id)).updatedAt;

    await PATCH(post(`/api/admin/age-groups/${group.id}`, { name: "المنصورون" }), withId(group.id));

    const after = await personFor(member.id);
    expect(after.age).toBe("المنصورون");
    expect(after.updatedAt.getTime()).toBe(before.getTime());
  });

  it("keeps the payment proof order, that list sorts on the same field", async () => {
    await signInAsAdmin(await createAdmin());
    const group = await prisma.ageGroup.create({ data: { name: "المنصورين" } });
    const older = await makeMember({
      fullName: "محمد",
      age: "المنصورين",
      paymentMethod: "بنكيلي",
      paymentProof: "a.webp",
    });
    const newer = await makeMember({
      fullName: "أحمد",
      age: "المبشرين",
      paymentMethod: "بنكيلي",
      paymentProof: "b.webp",
    });

    await PATCH(post(`/api/admin/age-groups/${group.id}`, { name: "المنصورون" }), withId(group.id));

    const rows = await prisma.membership.findMany({
      where: { paymentProof: { not: null } },
      orderBy: { updatedAt: "desc" },
      select: { userId: true },
    });
    expect(rows[0].userId).toBe(newer.userId);
    expect(rows[1].userId).toBe(older.userId);
  });

  it("leaves members alone when the new name is taken", async () => {
    await signInAsAdmin(await createAdmin());
    const group = await prisma.ageGroup.create({ data: { name: "المنصورين" } });
    await prisma.ageGroup.create({ data: { name: "المبشرين" } });
    await aMember("محمد", "المنصورين");

    const res = await PATCH(
      post(`/api/admin/age-groups/${group.id}`, { name: "المبشرين" }),
      withId(group.id),
    );

    expect(res.status).toBe(409);
    expect(await prisma.membership.count({ where: { user: { age: "المنصورين" } } })).toBe(1);
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

    const res = await DELETE(post(`/api/admin/age-groups/${group.id}`, {}), withId(group.id));

    expect(res.status).toBe(200);
    expect(await prisma.membership.count({ where: { user: { age: "المنصورين" } } })).toBe(1);
  });
});
