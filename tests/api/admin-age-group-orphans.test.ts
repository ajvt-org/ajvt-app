import { describe, it, expect, beforeEach } from "vitest";
import { GET } from "@/app/api/admin/age-groups/route";
import { POST } from "@/app/api/admin/age-groups/reassign/route";
import { prisma } from "@/lib/prisma";
import { resetDb, post, createAdmin, signInAsAdmin } from "./helpers";

function reassign(body: unknown) {
  return post("/api/admin/age-groups/reassign", body);
}

async function aMember(fullName: string, age: string) {
  return prisma.member.create({
    data: { fullName, age, paymentMethod: "بنكيلي", phone: null },
  });
}

describe("GET /api/admin/age-groups", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("lists the age values members hold that no group matches", async () => {
    await signInAsAdmin(await createAdmin());
    await prisma.ageGroup.create({ data: { name: "المنصورون" } });
    await aMember("محمد", "المنصورين");
    await aMember("أحمد", "المنصورين");
    await aMember("سالم", "المنصورون");

    const body = await (await GET()).json();

    expect(body.orphans).toEqual([{ name: "المنصورين", count: 2 }]);
  });

  it("reports nothing when every member matches a group", async () => {
    await signInAsAdmin(await createAdmin());
    await prisma.ageGroup.create({ data: { name: "المنصورون" } });
    await aMember("محمد", "المنصورون");

    const body = await (await GET()).json();

    expect(body.orphans).toEqual([]);
  });

  it("puts the biggest orphan first, it is the one worth fixing", async () => {
    await signInAsAdmin(await createAdmin());
    await aMember("محمد", "أ");
    await aMember("أحمد", "ب");
    await aMember("سالم", "ب");

    const body = await (await GET()).json();

    expect(body.orphans.map((o: { name: string }) => o.name)).toEqual(["ب", "أ"]);
  });
});

describe("POST /api/admin/age-groups/reassign", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("refuses an anonymous caller", async () => {
    await prisma.ageGroup.create({ data: { name: "المنصورون" } });
    await aMember("محمد", "المنصورين");

    const res = await POST(reassign({ from: "المنصورين", to: "المنصورون" }));

    expect(res.status).toBe(401);
    expect(await prisma.member.count({ where: { age: "المنصورين" } })).toBe(1);
  });

  it("moves the stranded members onto the real group", async () => {
    await signInAsAdmin(await createAdmin());
    await prisma.ageGroup.create({ data: { name: "المنصورون" } });
    await aMember("محمد", "المنصورين");
    await aMember("أحمد", "المنصورين");
    await aMember("سالم", "المبشرين");

    const res = await POST(reassign({ from: "المنصورين", to: "المنصورون" }));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ moved: 2 });
    expect(await prisma.member.count({ where: { age: "المنصورون" } })).toBe(2);
    expect(await prisma.member.count({ where: { age: "المبشرين" } })).toBe(1);
  });

  it("refuses a target that is not a group, that would just move the orphan", async () => {
    await signInAsAdmin(await createAdmin());
    await aMember("محمد", "المنصورين");

    const res = await POST(reassign({ from: "المنصورين", to: "المنصورون" }));

    expect(res.status).toBe(404);
    expect(await prisma.member.count({ where: { age: "المنصورين" } })).toBe(1);
  });

  it("says so when the old value matches nobody", async () => {
    await signInAsAdmin(await createAdmin());
    await prisma.ageGroup.create({ data: { name: "المنصورون" } });

    const res = await POST(reassign({ from: "لا أحد", to: "المنصورون" }));

    expect(res.status).toBe(404);
  });

  it("records the move", async () => {
    await signInAsAdmin(await createAdmin());
    const target = await prisma.ageGroup.create({ data: { name: "المنصورون" } });
    await aMember("محمد", "المنصورين");

    await POST(reassign({ from: "المنصورين", to: "المنصورون" }));

    const entry = await prisma.auditLog.findFirstOrThrow({
      where: { action: "REASSIGN_AGE_GROUP" },
    });
    expect(entry.targetType).toBe("AgeGroup");
    expect(entry.targetId).toBe(target.id);
    expect(entry.before).toEqual({ name: "المنصورين" });
    expect(entry.after).toEqual({ name: "المنصورون" });
    expect(entry.meta).toEqual({ membersRenamed: 1 });
  });
});
