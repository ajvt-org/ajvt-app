import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { PATCH, DELETE } from "@/app/api/admin/activities/[id]/route";
import { resetDb, patch, del, createAdmin, signInAsAdmin, withId } from "./helpers";

async function anActivity(title: string, over: Record<string, unknown> = {}) {
  return prisma.activity.create({
    data: { title, description: "وصف", isOpen: true, ...over },
  });
}

async function someoneRegistered(activityId: string, name: string) {
  const user = await prisma.user.create({ data: { fullName: name } });
  return prisma.activityRegistration.create({
    data: { activityId, userId: user.id, status: "ACTIVE" },
  });
}

describe("acting on several activities at once", () => {
  beforeEach(async () => {
    await resetDb();
    await signInAsAdmin(await createAdmin());
  });

  it("closes the registration on each one it is given", async () => {
    const first = await anActivity("الأول");
    const second = await anActivity("الثاني");

    for (const id of [first.id, second.id]) {
      await PATCH(patch(`/api/admin/activities/${id}`, { isOpen: false }), withId(id));
    }

    const open = await prisma.activity.count({ where: { isOpen: true } });
    expect(open).toBe(0);
  });

  it("writes one line in the trail per activity closed", async () => {
    const first = await anActivity("الأول");
    const second = await anActivity("الثاني");

    for (const id of [first.id, second.id]) {
      await PATCH(patch(`/api/admin/activities/${id}`, { isOpen: false }), withId(id));
    }

    expect(await prisma.auditLog.count({ where: { action: "CLOSE_ACTIVITY_REGISTRATION" } })).toBe(
      2,
    );
  });

  it("leaves an activity that was already closed out of the trail", async () => {
    const closed = await anActivity("مغلق", { isOpen: false });

    await PATCH(patch(`/api/admin/activities/${closed.id}`, { isOpen: false }), withId(closed.id));

    expect(await prisma.auditLog.count({ where: { action: "CLOSE_ACTIVITY_REGISTRATION" } })).toBe(
      0,
    );
  });

  it("deletes each one and the registrations that hung off it", async () => {
    const first = await anActivity("الأول");
    const second = await anActivity("الثاني");
    await someoneRegistered(first.id, "محمد");
    await someoneRegistered(second.id, "أحمد");

    for (const id of [first.id, second.id]) {
      await DELETE(del(`/api/admin/activities/${id}`), withId(id));
    }

    expect(await prisma.activity.count()).toBe(0);
    expect(await prisma.activityRegistration.count()).toBe(0);
  });

  it("keeps the people themselves", async () => {
    const activity = await anActivity("الأول");
    await someoneRegistered(activity.id, "محمد");

    await DELETE(del(`/api/admin/activities/${activity.id}`), withId(activity.id));

    expect(await prisma.user.count()).toBe(1);
  });

  it("writes one line in the trail per activity deleted", async () => {
    const first = await anActivity("الأول");
    const second = await anActivity("الثاني");

    for (const id of [first.id, second.id]) {
      await DELETE(del(`/api/admin/activities/${id}`), withId(id));
    }

    expect(await prisma.auditLog.count({ where: { action: "DELETE_ACTIVITY" } })).toBe(2);
  });

  it("carries on when one of them is already gone", async () => {
    const alive = await anActivity("الأول");

    const missing = await DELETE(del("/api/admin/activities/gone"), withId("gone"));
    const removed = await DELETE(del(`/api/admin/activities/${alive.id}`), withId(alive.id));

    expect(missing.status).toBe(404);
    expect(removed.status).toBe(200);
    expect(await prisma.activity.count()).toBe(0);
  });
});
