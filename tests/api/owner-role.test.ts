import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { OWNER_ROLE, SUPER_ROLE } from "@/lib/adminRoles";
import { SCOPED_ROLE } from "@/lib/activityAccess";
import { resetDb, get, post, put, del, createAdmin, signInAsAdmin, withId } from "./helpers";

import { GET as LIST_ADMINS, POST as CREATE_ADMIN } from "@/app/api/admin/admins/route";
import { DELETE as DELETE_ADMIN } from "@/app/api/admin/admins/[id]/route";
import { PUT as SET_ACTIVITIES } from "@/app/api/admin/admins/[id]/activities/route";
import { GET as AUDIT_LOG } from "@/app/api/admin/audit-log/route";
import { GET as SITE_STATS } from "@/app/api/admin/site-stats/route";
import { GET as PAYMENT_PROOFS } from "@/app/api/admin/payment-proofs/route";
import { GET as LIST_MEMBERS } from "@/app/api/admin/members/route";

function createAccount(role: string) {
  return CREATE_ADMIN(
    post("/api/admin/admins", { username: "recruit", password: "longenough", role }),
  );
}

describe("the owner role", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("reaches everything a full access admin reaches", async () => {
    await signInAsAdmin(await createAdmin("owner", OWNER_ROLE));

    expect((await AUDIT_LOG(get("/api/admin/audit-log"))).status).toBe(200);
    expect((await SITE_STATS(get("/api/admin/site-stats"))).status).toBe(200);
    expect((await LIST_ADMINS()).status).toBe(200);
    expect((await LIST_MEMBERS(get("/api/admin/members"))).status).toBe(200);
    expect((await PAYMENT_PROOFS(get("/api/admin/payment-proofs"))).status).toBe(200);
  });

  it("leaves a narrower role exactly as narrow as it was", async () => {
    await signInAsAdmin(await createAdmin("nurse", "MEMBERS"));

    expect((await LIST_MEMBERS(get("/api/admin/members"))).status).toBe(200);
    expect((await AUDIT_LOG(get("/api/admin/audit-log"))).status).toBe(403);
    expect((await LIST_ADMINS()).status).toBe(403);
  });

  it("refuses to create an owner account for a full access admin", async () => {
    await signInAsAdmin(await createAdmin("boss", SUPER_ROLE));

    expect((await createAccount(OWNER_ROLE)).status).toBe(403);
    expect(await prisma.admin.count({ where: { role: OWNER_ROLE } })).toBe(0);
  });

  it("creates an owner account for an owner", async () => {
    await signInAsAdmin(await createAdmin("owner", OWNER_ROLE));

    expect((await createAccount(OWNER_ROLE)).status).toBe(201);
    expect(await prisma.admin.count({ where: { role: OWNER_ROLE } })).toBe(2);
  });

  it("does not fall back to full access when the role is not a real one", async () => {
    await signInAsAdmin(await createAdmin("boss", SUPER_ROLE));

    expect((await createAccount("QUIZ")).status).toBe(201);
    const made = await prisma.admin.findUniqueOrThrow({ where: { username: "recruit" } });
    expect(made.role).toBe("QUIZ");
  });

  it("refuses to delete the owner from a full access session", async () => {
    const owner = await createAdmin("owner", OWNER_ROLE);
    await signInAsAdmin(await createAdmin("boss", SUPER_ROLE));

    expect(
      (await DELETE_ADMIN(del(`/api/admin/admins/${owner.id}`), withId(owner.id))).status,
    ).toBe(403);
    expect(await prisma.admin.count({ where: { role: OWNER_ROLE } })).toBe(1);
  });

  it("refuses to scope the owner down to activities from a full access session", async () => {
    const activity = await prisma.activity.create({
      data: { title: "القافلة الصحية", description: "وصف" },
    });
    const owner = await createAdmin("owner", OWNER_ROLE);
    await signInAsAdmin(await createAdmin("boss", SUPER_ROLE));

    const refused = await SET_ACTIVITIES(
      put(`/api/admin/admins/${owner.id}/activities`, { activityIds: [activity.id] }),
      withId(owner.id),
    );

    expect(refused.status).toBe(403);
    const unchanged = await prisma.admin.findUniqueOrThrow({ where: { id: owner.id } });
    expect(unchanged.role).toBe(OWNER_ROLE);
    expect(unchanged.role).not.toBe(SCOPED_ROLE);
  });
});
