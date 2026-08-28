import { describe, it, expect, beforeEach } from "vitest";
import { POST as REGISTER } from "@/app/api/activities/register/route";
import { PATCH as UPDATE } from "@/app/api/admin/activities/[id]/route";
import { prisma } from "@/lib/prisma";
import {
  resetDb,
  post,
  patch,
  createUser,
  createAdmin,
  signInAs,
  signInAsAdmin,
  withId,
} from "./helpers";

async function activity(over: Record<string, unknown> = {}) {
  return prisma.activity.create({
    data: { title: "دوري القرية", description: "بطولة", isOpen: true, ...over },
  });
}

async function activeMember(user: { id: string }) {
  return prisma.member.create({
    data: {
      fullName: "أحمد",
      age: "البدريين",
      paymentMethod: "بنكيلي",
      status: "ACTIVE",
      userId: user.id,
    },
  });
}

const register = (activityId: string, memberId: string) =>
  REGISTER(post("/api/activities/register", { activityId, memberId }));

async function statusOf(activityId: string, memberId: string) {
  const row = await prisma.activityRegistration.findUniqueOrThrow({
    where: { memberId_activityId: { memberId, activityId } },
  });
  return row.status;
}

describe("an activity that approves registrations itself", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("waits for the admin by default", async () => {
    const a = await activity();
    const user = await createUser();
    const member = await activeMember(user);
    await signInAs(user);

    await register(a.id, member.id);

    expect(await statusOf(a.id, member.id)).toBe("PENDING");
  });

  it("takes the member in straight away when the flag is on", async () => {
    const a = await activity({ autoApprove: true });
    const user = await createUser();
    const member = await activeMember(user);
    await signInAs(user);

    await register(a.id, member.id);

    expect(await statusOf(a.id, member.id)).toBe("ACTIVE");
  });

  it("still refuses a closed activity", async () => {
    const a = await activity({ autoApprove: true, isOpen: false });
    const user = await createUser();
    const member = await activeMember(user);
    await signInAs(user);

    expect((await register(a.id, member.id)).status).toBe(409);
  });

  it("still refuses once the seats are gone", async () => {
    const a = await activity({ autoApprove: true, capacity: 1 });
    const holder = await prisma.member.create({
      data: {
        user: { create: {} },
        fullName: "سالم",
        age: "البدريين",
        paymentMethod: "بنكيلي",
        status: "ACTIVE",
      },
    });
    await prisma.activityRegistration.create({
      data: { memberId: holder.id, activityId: a.id, status: "ACTIVE" },
    });
    const user = await createUser();
    const member = await activeMember(user);
    await signInAs(user);

    expect((await register(a.id, member.id)).status).toBe(409);
  });

  it("is turned on from the admin panel", async () => {
    const a = await activity();
    await signInAsAdmin(await createAdmin());

    const res = await UPDATE(
      patch(`/api/admin/activities/${a.id}`, { autoApprove: true }),
      withId(a.id),
    );

    expect(res.status).toBe(200);
    expect((await prisma.activity.findUniqueOrThrow({ where: { id: a.id } })).autoApprove).toBe(
      true,
    );
  });

  it("is turned off again the same way", async () => {
    const a = await activity({ autoApprove: true });
    await signInAsAdmin(await createAdmin());

    await UPDATE(patch(`/api/admin/activities/${a.id}`, { autoApprove: false }), withId(a.id));

    expect((await prisma.activity.findUniqueOrThrow({ where: { id: a.id } })).autoApprove).toBe(
      false,
    );
  });
});
