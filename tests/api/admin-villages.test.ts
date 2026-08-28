import { describe, it, expect, beforeEach } from "vitest";
import { GET, POST } from "@/app/api/admin/villages/route";
import { PATCH, DELETE } from "@/app/api/admin/villages/[id]/route";
import { GET as PUBLIC_GET } from "@/app/api/villages/route";
import { prisma } from "@/lib/prisma";
import { HOME_VILLAGE, OTHER_VILLAGE } from "@/lib/villages";
import { resetDb, get, post, createAdmin, signInAsAdmin, withId } from "./helpers";

async function aMember(fullName: string, village: string) {
  return prisma.member.create({
    data: { user: { create: {} }, fullName, village, paymentMethod: "بنكيلي" },
  });
}

describe("GET /api/villages", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("lists the managed villages for the public form", async () => {
    await prisma.village.create({ data: { name: HOME_VILLAGE } });
    await prisma.village.create({ data: { name: "أفجار" } });

    const res = await PUBLIC_GET(get("/api/villages"));

    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ villages: [HOME_VILLAGE, "أفجار"] });
  });
});

describe("GET /api/admin/villages", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("refuses an anonymous caller", async () => {
    expect((await GET(get("/api/admin/villages"))).status).toBe(401);
  });

  it("counts the members sitting in each village", async () => {
    await signInAsAdmin(await createAdmin());
    await prisma.village.create({ data: { name: HOME_VILLAGE } });
    await prisma.village.create({ data: { name: "أفجار" } });
    await aMember("محمد", HOME_VILLAGE);
    await aMember("أحمد", "أفجار");
    await aMember("سالم", "أفجار");

    const body = await (await GET(get("/api/admin/villages"))).json();

    expect(body.villages.map((v: { name: string; count: number }) => [v.name, v.count])).toEqual([
      [HOME_VILLAGE, 1],
      ["أفجار", 2],
    ]);
  });

  it("counts the members who picked the other option", async () => {
    await signInAsAdmin(await createAdmin());
    await prisma.village.create({ data: { name: HOME_VILLAGE } });
    await aMember("محمد", OTHER_VILLAGE);
    await aMember("أحمد", OTHER_VILLAGE);

    const body = await (await GET(get("/api/admin/villages"))).json();

    expect(body.otherCount).toBe(2);
    expect(body.unlisted).toEqual([]);
  });

  it("surfaces a village nobody manages any more", async () => {
    await signInAsAdmin(await createAdmin());
    await prisma.village.create({ data: { name: HOME_VILLAGE } });
    await aMember("محمد", "بوتلميت");

    const body = await (await GET(get("/api/admin/villages"))).json();

    expect(body.unlisted).toEqual([{ name: "بوتلميت", count: 1 }]);
  });
});

describe("POST /api/admin/villages", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("refuses an anonymous caller", async () => {
    const res = await POST(post("/api/admin/villages", { name: "أفجار" }));

    expect(res.status).toBe(401);
    expect(await prisma.village.count()).toBe(0);
  });

  it("adds a village", async () => {
    await signInAsAdmin(await createAdmin());

    const res = await POST(post("/api/admin/villages", { name: " أفجار " }));

    expect(res.status).toBe(201);
    expect(await prisma.village.findUnique({ where: { name: "أفجار" } })).not.toBeNull();
  });

  it("refuses the reserved other option as a name", async () => {
    await signInAsAdmin(await createAdmin());

    const res = await POST(post("/api/admin/villages", { name: OTHER_VILLAGE }));

    expect(res.status).toBe(400);
    expect(await prisma.village.count()).toBe(0);
  });

  it("refuses a duplicate", async () => {
    await signInAsAdmin(await createAdmin());
    await prisma.village.create({ data: { name: "أفجار" } });

    expect((await POST(post("/api/admin/villages", { name: "أفجار" }))).status).toBe(409);
  });

  it("refuses a blank name", async () => {
    await signInAsAdmin(await createAdmin());

    expect((await POST(post("/api/admin/villages", { name: "   " }))).status).toBe(400);
  });

  it("refuses a name over thirty characters", async () => {
    await signInAsAdmin(await createAdmin());

    expect((await POST(post("/api/admin/villages", { name: "ب".repeat(31) }))).status).toBe(400);
  });

  it("records the creation in the audit log", async () => {
    await signInAsAdmin(await createAdmin());

    await POST(post("/api/admin/villages", { name: "أفجار" }));

    expect(await prisma.auditLog.count({ where: { action: "CREATE_VILLAGE" } })).toBe(1);
  });
});

describe("PATCH /api/admin/villages/[id]", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("refuses an anonymous caller", async () => {
    const village = await prisma.village.create({ data: { name: "أفجار" } });

    const res = await PATCH(
      post(`/api/admin/villages/${village.id}`, { name: "افجار" }),
      withId(village.id),
    );

    expect(res.status).toBe(401);
    expect((await prisma.village.findUniqueOrThrow({ where: { id: village.id } })).name).toBe(
      "أفجار",
    );
  });

  it("renames every member carrying the old name", async () => {
    await signInAsAdmin(await createAdmin());
    const village = await prisma.village.create({ data: { name: "أفجار" } });
    await aMember("محمد", "أفجار");
    await aMember("أحمد", "أفجار");
    await aMember("سالم", HOME_VILLAGE);

    const res = await PATCH(
      post(`/api/admin/villages/${village.id}`, { name: "افجار" }),
      withId(village.id),
    );

    expect(res.status).toBe(200);
    expect(await prisma.member.count({ where: { village: "افجار" } })).toBe(2);
    expect(await prisma.member.count({ where: { village: "أفجار" } })).toBe(0);
    expect(await prisma.member.count({ where: { village: HOME_VILLAGE } })).toBe(1);
  });

  it("does not touch updatedAt, the member page reads it as their decision date", async () => {
    await signInAsAdmin(await createAdmin());
    const village = await prisma.village.create({ data: { name: "أفجار" } });
    const member = await aMember("محمد", "أفجار");

    await PATCH(post(`/api/admin/villages/${village.id}`, { name: "افجار" }), withId(village.id));

    const after = await prisma.member.findUniqueOrThrow({ where: { id: member.id } });
    expect(after.village).toBe("افجار");
    expect(after.updatedAt.getTime()).toBe(member.updatedAt.getTime());
  });

  it("records how many members moved", async () => {
    await signInAsAdmin(await createAdmin());
    const village = await prisma.village.create({ data: { name: "أفجار" } });
    await aMember("محمد", "أفجار");

    await PATCH(post(`/api/admin/villages/${village.id}`, { name: "افجار" }), withId(village.id));

    const entry = await prisma.auditLog.findFirstOrThrow({ where: { action: "UPDATE_VILLAGE" } });
    expect(entry.targetType).toBe("Village");
    expect(entry.targetId).toBe(village.id);
    expect(entry.before).toEqual({ name: "أفجار" });
    expect(entry.after).toEqual({ name: "افجار" });
    expect(entry.meta).toEqual({ membersRenamed: 1 });
  });

  it("leaves members alone when the new name is taken", async () => {
    await signInAsAdmin(await createAdmin());
    const village = await prisma.village.create({ data: { name: "أفجار" } });
    await prisma.village.create({ data: { name: HOME_VILLAGE } });
    await aMember("محمد", "أفجار");

    const res = await PATCH(
      post(`/api/admin/villages/${village.id}`, { name: HOME_VILLAGE }),
      withId(village.id),
    );

    expect(res.status).toBe(409);
    expect(await prisma.member.count({ where: { village: "أفجار" } })).toBe(1);
  });

  it("refuses renaming a village to the reserved other option", async () => {
    await signInAsAdmin(await createAdmin());
    const village = await prisma.village.create({ data: { name: "أفجار" } });

    const res = await PATCH(
      post(`/api/admin/villages/${village.id}`, { name: OTHER_VILLAGE }),
      withId(village.id),
    );

    expect(res.status).toBe(400);
  });

  it("answers 404 for a village that is gone", async () => {
    await signInAsAdmin(await createAdmin());

    const res = await PATCH(post("/api/admin/villages/nope", { name: "افجار" }), withId("nope"));

    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/admin/villages/[id]", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("keeps the members that were in the deleted village", async () => {
    await signInAsAdmin(await createAdmin());
    const village = await prisma.village.create({ data: { name: "أفجار" } });
    await aMember("محمد", "أفجار");

    const res = await DELETE(post(`/api/admin/villages/${village.id}`, {}), withId(village.id));

    expect(res.status).toBe(200);
    expect(await prisma.member.count({ where: { village: "أفجار" } })).toBe(1);
    expect(await prisma.village.count()).toBe(0);
  });

  it("refuses an anonymous caller", async () => {
    const village = await prisma.village.create({ data: { name: "أفجار" } });

    const res = await DELETE(post(`/api/admin/villages/${village.id}`, {}), withId(village.id));

    expect(res.status).toBe(401);
    expect(await prisma.village.count()).toBe(1);
  });
});
