import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { POST as CREATE, GET as LIST } from "@/app/api/admin/activities/route";
import { PATCH } from "@/app/api/admin/activities/[id]/route";
import { POST as DUPLICATE } from "@/app/api/admin/activities/[id]/duplicate/route";
import { GET as PUBLIC } from "@/app/api/activities/route";
import { resetDb, get, post, patch, createAdmin, signInAsAdmin, withId } from "./helpers";

async function anActivity(over: Record<string, unknown> = {}) {
  return prisma.activity.create({
    data: { title: "دوري القرية", description: "بطولة", isOpen: true, ...over },
  });
}

function edit(id: string, body: Record<string, unknown>) {
  return PATCH(patch(`/api/admin/activities/${id}`, body), withId(id));
}

async function publicTitles() {
  const body = await (await PUBLIC(get("/api/activities"))).json();
  return (body.activities as { title: string }[]).map((a) => a.title);
}

describe("publishing an activity", () => {
  beforeEach(async () => {
    await resetDb();
    await signInAsAdmin(await createAdmin());
  });

  it("starts a new activity as a draft, off the public pages", async () => {
    await CREATE(post("/api/admin/activities", { title: "نشاط جديد", description: "وصف" }));

    const created = await prisma.activity.findFirstOrThrow();
    expect(created.published).toBe(false);
    expect(await publicTitles()).toEqual([]);
  });

  it("puts it on the public pages once published", async () => {
    const activity = await anActivity({ published: false });

    await edit(activity.id, { published: true });

    expect(await publicTitles()).toEqual(["دوري القرية"]);
  });

  it("takes it back off when hidden", async () => {
    const activity = await anActivity({ published: true });

    await edit(activity.id, { published: false });

    expect(await publicTitles()).toEqual([]);
  });

  it("leaves what already existed published", async () => {
    await anActivity();

    expect((await prisma.activity.findFirstOrThrow()).published).toBe(true);
  });

  it("keeps a draft on the admin list, which is where it is finished", async () => {
    await anActivity({ published: false });

    const body = await (await LIST(get("/api/admin/activities"))).json();
    expect(body.activities).toHaveLength(1);
  });

  it("records publishing under its own name", async () => {
    const activity = await anActivity({ published: false });

    await edit(activity.id, { published: true });

    expect(await prisma.auditLog.count({ where: { action: "PUBLISH_ACTIVITY" } })).toBe(1);
  });

  it("says nothing to the trail when the flag does not move", async () => {
    const activity = await anActivity({ published: true });

    await edit(activity.id, { published: true });

    expect(await prisma.auditLog.count({ where: { action: "PUBLISH_ACTIVITY" } })).toBe(0);
  });
});

describe("opening and closing the registration", () => {
  beforeEach(async () => {
    await resetDb();
    await signInAsAdmin(await createAdmin());
  });

  it("closes it and records why", async () => {
    const activity = await anActivity({ isOpen: true });

    await edit(activity.id, { isOpen: false });

    expect((await prisma.activity.findUniqueOrThrow({ where: { id: activity.id } })).isOpen).toBe(
      false,
    );
    expect(await prisma.auditLog.count({ where: { action: "CLOSE_ACTIVITY_REGISTRATION" } })).toBe(
      1,
    );
  });

  it("opens it again", async () => {
    const activity = await anActivity({ isOpen: false });

    await edit(activity.id, { isOpen: true });

    expect(await prisma.auditLog.count({ where: { action: "OPEN_ACTIVITY_REGISTRATION" } })).toBe(
      1,
    );
  });
});

describe("duplicating an activity", () => {
  beforeEach(async () => {
    await resetDb();
    await signInAsAdmin(await createAdmin());
  });

  it("copies the settings and marks the copy a draft", async () => {
    const source = await anActivity({
      capacity: 24,
      isTournament: true,
      format: "KNOCKOUT",
      teamSize: 5,
      published: true,
    });

    const body = await (
      await DUPLICATE(post(`/api/admin/activities/${source.id}/duplicate`, {}), withId(source.id))
    ).json();

    expect(body.activity.title).toBe("دوري القرية (نسخة)");
    expect(body.activity.capacity).toBe(24);
    expect(body.activity.isTournament).toBe(true);
    expect(body.activity.teamSize).toBe(5);
    expect(body.activity.published).toBe(false);
  });

  it("never copies who signed up", async () => {
    const source = await anActivity();
    const [user] = [await prisma.user.create({ data: { fullName: "محمد" } })];
    const member = await prisma.member.create({
      data: { userId: user.id, paymentMethod: "بنكيلي", status: "ACTIVE" },
    });
    await prisma.activityRegistration.create({
      data: { activityId: source.id, memberId: member.id, status: "ACTIVE" },
    });

    const body = await (
      await DUPLICATE(post(`/api/admin/activities/${source.id}/duplicate`, {}), withId(source.id))
    ).json();

    expect(
      await prisma.activityRegistration.count({ where: { activityId: body.activity.id } }),
    ).toBe(0);
  });

  it("puts the copy last in the order", async () => {
    const source = await anActivity({ order: 3 });

    const body = await (
      await DUPLICATE(post(`/api/admin/activities/${source.id}/duplicate`, {}), withId(source.id))
    ).json();

    expect(body.activity.order).toBe(4);
  });

  it("records the copy in the trail", async () => {
    const source = await anActivity();

    await DUPLICATE(post(`/api/admin/activities/${source.id}/duplicate`, {}), withId(source.id));

    expect(await prisma.auditLog.count({ where: { action: "DUPLICATE_ACTIVITY" } })).toBe(1);
  });

  it("refuses an activity that is not there", async () => {
    const res = await DUPLICATE(
      post("/api/admin/activities/nobody/duplicate", {}),
      withId("nobody"),
    );

    expect(res.status).toBe(404);
  });
});
