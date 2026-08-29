import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { PATCH } from "@/app/api/admin/activities/[id]/route";
import {
  resetDb,
  patch,
  createAdmin,
  createUsers,
  signInAsAdmin,
  makeMember,
  withId,
} from "./helpers";

const LINK = "https://chat.whatsapp.com/abc";

async function anActivity(over: Record<string, unknown> = {}) {
  return prisma.activity.create({
    data: { title: "حملة النظافة", description: "تنظيف", isOpen: true, ...over },
  });
}

async function someoneWaiting(activityId: string, name: string, status = "PENDING") {
  const [user] = await createUsers(1);
  const member = await makeMember({
    fullName: name,
    age: "البدريين",
    paymentMethod: "بنكيلي",
    status: "ACTIVE",
    userId: user.id,
  });
  return prisma.activityRegistration.create({
    data: { memberId: member.id, activityId, status: status as "PENDING" },
  });
}

function convert(id: string, body: Record<string, unknown> = {}) {
  return PATCH(
    patch(`/api/admin/activities/${id}`, { isVolunteer: true, whatsappLink: LINK, ...body }),
    withId(id),
  );
}

function statusesOf(activityId: string) {
  return prisma.activityRegistration
    .findMany({ where: { activityId }, select: { status: true } })
    .then((rows) => rows.map((r) => r.status).sort());
}

describe("turning an activity into a campaign", () => {
  beforeEach(async () => {
    await resetDb();
    await signInAsAdmin(await createAdmin());
  });

  it("refuses while registrations are still waiting, and says how many", async () => {
    const activity = await anActivity();
    await someoneWaiting(activity.id, "محمد");
    await someoneWaiting(activity.id, "أحمد");

    const res = await convert(activity.id);
    const body = await res.json();

    expect(res.status).toBe(409);
    expect(body.pending).toBe(2);
    const after = await prisma.activity.findUniqueOrThrow({ where: { id: activity.id } });
    expect(after.isVolunteer).toBe(false);
  });

  it("accepts them all when told to", async () => {
    const activity = await anActivity();
    await someoneWaiting(activity.id, "محمد");

    expect((await convert(activity.id, { settlePending: "accept" })).status).toBe(200);

    expect(await statusesOf(activity.id)).toEqual(["ACTIVE"]);
    const after = await prisma.activity.findUniqueOrThrow({ where: { id: activity.id } });
    expect(after.isVolunteer).toBe(true);
  });

  it("rejects them all when told to", async () => {
    const activity = await anActivity();
    await someoneWaiting(activity.id, "محمد");

    expect((await convert(activity.id, { settlePending: "reject" })).status).toBe(200);

    expect(await statusesOf(activity.id)).toEqual(["REJECTED"]);
  });

  it("leaves registrations that were already settled alone", async () => {
    const activity = await anActivity();
    await someoneWaiting(activity.id, "محمد", "ACTIVE");
    await someoneWaiting(activity.id, "أحمد", "REJECTED");
    await someoneWaiting(activity.id, "سالم");

    await convert(activity.id, { settlePending: "reject" });

    expect(await statusesOf(activity.id)).toEqual(["ACTIVE", "REJECTED", "REJECTED"]);
  });

  it("goes through untouched when nothing is waiting", async () => {
    const activity = await anActivity();
    await someoneWaiting(activity.id, "محمد", "ACTIVE");

    expect((await convert(activity.id)).status).toBe(200);
    expect(await statusesOf(activity.id)).toEqual(["ACTIVE"]);
  });

  it("says what it did in the audit trail", async () => {
    const activity = await anActivity();
    await someoneWaiting(activity.id, "محمد");

    await convert(activity.id, { settlePending: "accept" });

    const entry = await prisma.auditLog.findFirst({
      where: { action: "APPROVE_ACTIVITY_REGISTRATION", targetId: activity.id },
    });
    expect(entry).not.toBeNull();
  });

  it("does not ask again for an activity that is already a campaign", async () => {
    const activity = await anActivity({ isVolunteer: true, whatsappLink: LINK });
    await someoneWaiting(activity.id, "محمد");

    expect((await convert(activity.id, { title: "حملة النظافة والتشجير" })).status).toBe(200);
  });
});
