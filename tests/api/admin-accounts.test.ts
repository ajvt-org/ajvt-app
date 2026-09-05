import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { SCOPED_ROLE } from "@/lib/activityAccess";
import { OWNER_ROLE, SUPER_ROLE } from "@/lib/adminRoles";
import { resetDb, put, createAdmin, signInAsAdmin, withId } from "./helpers";

import { GET as LIST } from "@/app/api/admin/admins/route";
import { PUT as SET_ACTIVITIES } from "@/app/api/admin/admins/[id]/activities/route";

function activity(title: string) {
  return prisma.activity.create({ data: { title, description: "وصف" } });
}

function setActivities(adminId: string, activityIds: string[]) {
  return SET_ACTIVITIES(
    put(`/api/admin/admins/${adminId}/activities`, { activityIds }),
    withId(adminId),
  );
}

describe("attaching activities to an admin", () => {
  beforeEach(async () => {
    await resetDb();
    await signInAsAdmin(await createAdmin("boss", "SUPER"));
  });

  it("scopes the account and reports which activities it holds", async () => {
    const caravan = await activity("القافلة الصحية");
    const other = await createAdmin("nurse", "MEMBERS");

    expect((await setActivities(other.id, [caravan.id])).status).toBe(200);

    const { admins } = await (await LIST()).json();
    const scoped = admins.find((a: { username: string }) => a.username === "nurse");
    expect(scoped.role).toBe(SCOPED_ROLE);
    expect(scoped.activities).toEqual([{ id: caravan.id, title: "القافلة الصحية" }]);
  });

  it("takes several activities at once and replaces the previous set", async () => {
    const caravan = await activity("القافلة الصحية");
    const cup = await activity("البطولة الكبرى");
    const other = await createAdmin("nurse", "MEMBERS");

    await setActivities(other.id, [caravan.id, cup.id]);
    await setActivities(other.id, [cup.id]);

    const links = await prisma.adminActivity.findMany({ where: { adminId: other.id } });
    expect(links.map((l) => l.activityId)).toEqual([cup.id]);
  });

  it("refuses an empty list, which would leave the account seeing nothing", async () => {
    const other = await createAdmin("nurse", "MEMBERS");

    const res = await setActivities(other.id, []);

    expect(res.status).toBe(400);
    expect((await prisma.admin.findUniqueOrThrow({ where: { id: other.id } })).role).toBe(
      "MEMBERS",
    );
  });

  it("refuses to scope the account doing the scoping", async () => {
    const caravan = await activity("القافلة الصحية");
    const me = await prisma.admin.findUniqueOrThrow({ where: { username: "boss" } });

    const res = await setActivities(me.id, [caravan.id]);

    expect(res.status).toBe(400);
    expect((await prisma.admin.findUniqueOrThrow({ where: { id: me.id } })).role).toBe("SUPER");
  });

  it("refuses an activity that does not exist", async () => {
    const other = await createAdmin("nurse", "MEMBERS");

    expect((await setActivities(other.id, ["missing"])).status).toBe(400);
  });

  it("signs the account out of its old session", async () => {
    const caravan = await activity("القافلة الصحية");
    const other = await createAdmin("nurse", "MEMBERS");

    await setActivities(other.id, [caravan.id]);

    const after = await prisma.admin.findUniqueOrThrow({ where: { id: other.id } });
    expect(after.tokenVersion).toBe(other.tokenVersion + 1);
  });
});

describe("the admins list", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("is closed to an admin that is not a full admin", async () => {
    await signInAsAdmin(await createAdmin("acts", "ACTIVITIES"));

    expect((await LIST()).status).toBe(403);
  });

  it("sends nothing but the username of an account ranked above the viewer", async () => {
    const owner = await createAdmin("chief", OWNER_ROLE);
    await prisma.admin.update({
      where: { id: owner.id },
      data: { lastLoginAt: new Date(), lastLoginIp: "10.0.0.9" },
    });
    await signInAsAdmin(await createAdmin("boss", SUPER_ROLE));

    const { admins } = await (await LIST()).json();
    const row = admins.find((a: { username: string }) => a.username === "chief");

    expect(Object.keys(row).sort()).toEqual(["id", "username"]);
    expect(JSON.stringify(admins)).not.toContain("10.0.0.9");
  });

  it("sends an account of the same rank in full", async () => {
    const peer = await createAdmin("peer", SUPER_ROLE);
    await prisma.admin.update({
      where: { id: peer.id },
      data: { lastLoginAt: new Date(), lastLoginIp: "10.0.0.9" },
    });
    await signInAsAdmin(await createAdmin("boss", SUPER_ROLE));

    const { admins } = await (await LIST()).json();
    const row = admins.find((a: { username: string }) => a.username === "peer");

    expect(row.role).toBe(SUPER_ROLE);
    expect(row.lastLoginIp).toBe("10.0.0.9");
  });

  it("sends every row in full to the owner", async () => {
    await createAdmin("peer", SUPER_ROLE);
    await signInAsAdmin(await createAdmin("chief", OWNER_ROLE));

    const { admins } = await (await LIST()).json();

    expect(admins.every((a: { role?: string }) => typeof a.role === "string")).toBe(true);
  });
});
