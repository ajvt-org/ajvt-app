import { describe, it, expect, beforeEach } from "vitest";
import { GET as PUBLIC_AGES } from "@/app/api/ages/route";
import { POST as REGISTER } from "@/app/api/auth/register/route";
import { GET as ADMIN_AGES, POST as ADMIN_CREATE } from "@/app/api/admin/age-groups/route";
import { PATCH } from "@/app/api/admin/age-groups/[id]/route";
import { prisma } from "@/lib/prisma";
import { HOME_VILLAGE } from "@/lib/villages";
import { resetDb, get, post, patch, createAdmin, signInAsAdmin, withId } from "./helpers";

const validBody = {
  phone: "22119911",
  password: "secret12",
  fullName: "محمد ولد أحمد",
  age: "البدريين",
  village: HOME_VILLAGE,
};

describe("suggesting an age group when signing up", () => {
  beforeEach(async () => {
    await resetDb();
    await prisma.village.create({ data: { name: HOME_VILLAGE } });
    await prisma.ageGroup.create({ data: { name: "البدريين", approved: true } });
  });

  it("keeps a suggested group out of the public list", async () => {
    await REGISTER(post("/api/auth/register", { ...validBody, age: "الفلانيين" }));

    const group = await prisma.ageGroup.findUniqueOrThrow({ where: { name: "الفلانيين" } });
    expect(group.approved).toBe(false);
    expect((await (await PUBLIC_AGES(get("/api/ages"))).json()).ages).toEqual(["البدريين"]);
  });

  it("still files the person under the group they typed", async () => {
    await REGISTER(post("/api/auth/register", { ...validBody, age: "الفلانيين" }));

    expect((await prisma.user.findFirstOrThrow({ where: { phone: validBody.phone } })).age).toBe(
      "الفلانيين",
    );
  });

  it("does not demote a group that is already approved", async () => {
    await REGISTER(post("/api/auth/register", validBody));

    expect(
      (await prisma.ageGroup.findUniqueOrThrow({ where: { name: "البدريين" } })).approved,
    ).toBe(true);
  });

  it("creates nothing extra for someone outside the home village", async () => {
    await prisma.village.create({ data: { name: "أفجار" } });
    await REGISTER(
      post("/api/auth/register", { ...validBody, village: "أفجار", age: "الفلانيين" }),
    );

    expect(await prisma.ageGroup.count()).toBe(1);
  });
});

describe("moderating a suggested age group", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("marks a group an admin adds as approved straight away", async () => {
    await signInAsAdmin(await createAdmin());

    await ADMIN_CREATE(post("/api/admin/age-groups", { name: "البدريين" }));

    expect(
      (await prisma.ageGroup.findUniqueOrThrow({ where: { name: "البدريين" } })).approved,
    ).toBe(true);
  });

  it("shows the admin the suggested groups alongside the approved ones", async () => {
    await signInAsAdmin(await createAdmin());
    await prisma.ageGroup.create({ data: { name: "الفلانيين", approved: false } });
    await prisma.ageGroup.create({ data: { name: "البدريين", approved: true } });

    const body = await (await ADMIN_AGES(get("/api/admin/age-groups"))).json();

    expect(body.ageGroups.map((g: { name: string; approved: boolean }) => g.approved)).toContain(
      false,
    );
  });

  it("publishes a group once an admin approves it", async () => {
    await signInAsAdmin(await createAdmin());
    const group = await prisma.ageGroup.create({ data: { name: "الفلانيين", approved: false } });

    const res = await PATCH(
      patch(`/api/admin/age-groups/${group.id}`, { approved: true }),
      withId(group.id),
    );

    expect(res.status).toBe(200);
    expect((await (await PUBLIC_AGES(get("/api/ages"))).json()).ages).toEqual(["الفلانيين"]);
  });

  it("records the approval in the audit trail", async () => {
    await signInAsAdmin(await createAdmin());
    const group = await prisma.ageGroup.create({ data: { name: "الفلانيين", approved: false } });

    await PATCH(patch(`/api/admin/age-groups/${group.id}`, { approved: true }), withId(group.id));

    expect(await prisma.auditLog.count({ where: { action: "APPROVE_AGE_GROUP" } })).toBe(1);
  });

  it("refuses an anonymous approval", async () => {
    const group = await prisma.ageGroup.create({ data: { name: "الفلانيين", approved: false } });

    const res = await PATCH(
      patch(`/api/admin/age-groups/${group.id}`, { approved: true }),
      withId(group.id),
    );

    expect(res.status).toBe(401);
    expect((await prisma.ageGroup.findUniqueOrThrow({ where: { id: group.id } })).approved).toBe(
      false,
    );
  });
});
