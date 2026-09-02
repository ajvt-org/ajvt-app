import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { OWNER_ROLE, SUPER_ROLE } from "@/lib/adminRoles";
import { SCOPED_ROLE } from "@/lib/activityAccess";
import { admins as messages } from "@/lib/messages";
import { resetDb, patch, createAdmin, signInAsAdmin, withId } from "./helpers";

import { PATCH as SET_ROLE } from "@/app/api/admin/admins/[id]/route";
import { GET as ME } from "@/app/api/admin/me/route";

function setRole(adminId: string, role: unknown) {
  return SET_ROLE(patch(`/api/admin/admins/${adminId}`, { role }), withId(adminId));
}

function roleOf(adminId: string) {
  return prisma.admin.findUniqueOrThrow({ where: { id: adminId } }).then((admin) => admin.role);
}

function roleChangeEntries() {
  return prisma.auditLog.findMany({ where: { action: "UPDATE_ADMIN_ROLE" } });
}

describe("a full access admin changing a role", () => {
  beforeEach(async () => {
    await resetDb();
    await signInAsAdmin(await createAdmin("boss", SUPER_ROLE));
  });

  it("promotes somebody to full access", async () => {
    const other = await createAdmin("nurse", "MEMBERS");

    expect((await setRole(other.id, SUPER_ROLE)).status).toBe(200);
    expect(await roleOf(other.id)).toBe(SUPER_ROLE);
  });

  it("is refused the owner role", async () => {
    const other = await createAdmin("nurse", "MEMBERS");

    const res = await setRole(other.id, OWNER_ROLE);

    expect(res.status).toBe(403);
    expect(await roleOf(other.id)).toBe("MEMBERS");
  });

  it("cannot take the owner role off an owner", async () => {
    const owner = await createAdmin("chief", OWNER_ROLE);

    const res = await setRole(owner.id, SUPER_ROLE);

    expect(res.status).toBe(403);
    expect(await roleOf(owner.id)).toBe(OWNER_ROLE);
  });

  it("refuses a role the app does not know", async () => {
    const other = await createAdmin("nurse", "MEMBERS");

    expect((await setRole(other.id, "ADMIN")).status).toBe(400);
    expect(await roleOf(other.id)).toBe("MEMBERS");
  });

  it("refuses the scoped role, which is set by picking activities", async () => {
    const other = await createAdmin("nurse", "MEMBERS");

    expect((await setRole(other.id, SCOPED_ROLE)).status).toBe(400);
    expect(await roleOf(other.id)).toBe("MEMBERS");
  });

  it("refuses an account that is not there", async () => {
    expect((await setRole("missing", SUPER_ROLE)).status).toBe(404);
  });
});

describe("an owner changing a role", () => {
  let owner: { id: string; username: string; tokenVersion: number };

  beforeEach(async () => {
    await resetDb();
    owner = await createAdmin("chief", OWNER_ROLE);
    await signInAsAdmin(owner);
  });

  it("grants the owner role", async () => {
    const other = await createAdmin("nurse", SUPER_ROLE);

    expect((await setRole(other.id, OWNER_ROLE)).status).toBe(200);
    expect(await roleOf(other.id)).toBe(OWNER_ROLE);
  });

  it("removes the owner role from another owner", async () => {
    const second = await createAdmin("deputy", OWNER_ROLE);

    expect((await setRole(second.id, SUPER_ROLE)).status).toBe(200);
    expect(await roleOf(second.id)).toBe(SUPER_ROLE);
  });
});

describe("nobody changing their own role", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("refuses a full access admin demoting itself", async () => {
    const me = await createAdmin("boss", SUPER_ROLE);
    await signInAsAdmin(me);

    const res = await setRole(me.id, "MEMBERS");

    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe(messages.cannotChangeOwnRole);
    expect(await roleOf(me.id)).toBe(SUPER_ROLE);
  });

  it("refuses a full access admin raising itself to owner", async () => {
    const me = await createAdmin("boss", SUPER_ROLE);
    await signInAsAdmin(me);

    const res = await setRole(me.id, OWNER_ROLE);

    expect(res.status).toBe(403);
    expect(await roleOf(me.id)).toBe(SUPER_ROLE);
  });

  it("refuses an owner demoting itself while another owner is left", async () => {
    const me = await createAdmin("chief", OWNER_ROLE);
    await createAdmin("deputy", OWNER_ROLE);
    await signInAsAdmin(me);

    const res = await setRole(me.id, SUPER_ROLE);

    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe(messages.cannotChangeOwnRole);
    expect(await roleOf(me.id)).toBe(OWNER_ROLE);
  });
});

describe("the last owner", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("cannot be demoted, which would leave the role ungrantable", async () => {
    const only = await createAdmin("chief", OWNER_ROLE);
    await createAdmin("boss", SUPER_ROLE);
    await signInAsAdmin(only);

    const res = await setRole(only.id, SUPER_ROLE);

    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe(messages.cannotDemoteLastOwner);
    expect(await roleOf(only.id)).toBe(OWNER_ROLE);
  });

  it("can still be demoted once a second owner exists", async () => {
    const first = await createAdmin("chief", OWNER_ROLE);
    const second = await createAdmin("deputy", SUPER_ROLE);
    await signInAsAdmin(first);

    await setRole(second.id, OWNER_ROLE);
    await signInAsAdmin(second);

    expect((await setRole(first.id, SUPER_ROLE)).status).toBe(200);
    expect(await roleOf(first.id)).toBe(SUPER_ROLE);
  });
});

describe("what a role change does beyond the role", () => {
  beforeEach(async () => {
    await resetDb();
    await signInAsAdmin(await createAdmin("boss", SUPER_ROLE));
  });

  it("takes effect without a new sign in", async () => {
    const other = await createAdmin("nurse", "MEMBERS");
    await signInAsAdmin(other);

    await signInAsAdmin(await prisma.admin.findUniqueOrThrow({ where: { username: "boss" } }));
    await setRole(other.id, "QUIZ");

    await signInAsAdmin(other);
    const { role } = await (await ME()).json();
    expect(role).toBe("QUIZ");
  });

  it("leaves the session token alone, so the account is not signed out", async () => {
    const other = await createAdmin("nurse", "MEMBERS");

    await setRole(other.id, "QUIZ");

    const after = await prisma.admin.findUniqueOrThrow({ where: { id: other.id } });
    expect(after.tokenVersion).toBe(other.tokenVersion);
  });

  it("clears the activity assignments when an account leaves the scoped role", async () => {
    const caravan = await prisma.activity.create({
      data: { title: "القافلة الصحية", description: "وصف" },
    });
    const other = await createAdmin("nurse", SCOPED_ROLE);
    await prisma.adminActivity.create({ data: { adminId: other.id, activityId: caravan.id } });

    await setRole(other.id, "ACTIVITIES");

    expect(await prisma.adminActivity.count({ where: { adminId: other.id } })).toBe(0);
  });

  it("keeps the assignments of an account that was never scoped", async () => {
    const caravan = await prisma.activity.create({
      data: { title: "القافلة الصحية", description: "وصف" },
    });
    const other = await createAdmin("nurse", "MEMBERS");
    await prisma.adminActivity.create({ data: { adminId: other.id, activityId: caravan.id } });

    await setRole(other.id, "QUIZ");

    expect(await prisma.adminActivity.count({ where: { adminId: other.id } })).toBe(1);
  });

  it("records the role before and after", async () => {
    const other = await createAdmin("nurse", "MEMBERS");

    await setRole(other.id, "QUIZ");

    const [entry] = await roleChangeEntries();
    expect(entry.targetLabel).toBe("nurse");
    expect(entry.targetId).toBe(other.id);
    expect(entry.before).toMatchObject({ role: "MEMBERS" });
    expect(entry.after).toMatchObject({ role: "QUIZ" });
  });

  it("records the assignments it cleared", async () => {
    const caravan = await prisma.activity.create({
      data: { title: "القافلة الصحية", description: "وصف" },
    });
    const other = await createAdmin("nurse", SCOPED_ROLE);
    await prisma.adminActivity.create({ data: { adminId: other.id, activityId: caravan.id } });

    await setRole(other.id, "ACTIVITIES");

    const [entry] = await roleChangeEntries();
    expect(entry.before).toMatchObject({ activityIds: [caravan.id] });
    expect(entry.after).toMatchObject({ activityIds: [] });
  });

  it("writes nothing to the log when it refuses", async () => {
    const owner = await createAdmin("chief", OWNER_ROLE);

    await setRole(owner.id, SUPER_ROLE);

    expect(await roleChangeEntries()).toEqual([]);
  });
});

describe("the role route and an admin below full access", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("is closed to a scoped admin", async () => {
    await signInAsAdmin(await createAdmin("acts", "ACTIVITIES"));
    const other = await createAdmin("nurse", "MEMBERS");

    expect((await setRole(other.id, SUPER_ROLE)).status).toBe(403);
    expect(await roleOf(other.id)).toBe("MEMBERS");
  });
});
