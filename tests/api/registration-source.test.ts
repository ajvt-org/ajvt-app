import { describe, it, expect, beforeEach } from "vitest";
import { POST as SELF_REGISTER } from "@/app/api/activities/register/route";
import {
  POST as ADMIN_REGISTER,
  PATCH as REVIEW,
} from "@/app/api/admin/activities/[id]/register/route";
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
  makeMember,
} from "./helpers";

async function anActivity(over: Record<string, unknown> = {}) {
  return prisma.activity.create({
    data: { title: "دوري القرية", description: "بطولة", isOpen: true, ...over },
  });
}

async function anApprovedMemberOf(user: { id: string }, fullName: string) {
  return makeMember({ fullName, age: "البدريين", status: "ACTIVE", userId: user.id });
}

function rowFor(userId: string, activityId: string) {
  return prisma.activityRegistration.findUniqueOrThrow({
    where: { userId_activityId: { userId, activityId } },
  });
}

describe("how a registration says it came about", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("marks a member registering themselves as their own doing", async () => {
    const user = await createUser();
    await signInAs(user);
    const member = await anApprovedMemberOf(user, "محمد");
    const activity = await anActivity();

    expect(
      (
        await SELF_REGISTER(
          post("/api/activities/register", { activityId: activity.id, userId: member.userId }),
        )
      ).status,
    ).toBe(200);

    const row = await rowFor(member.userId, activity.id);
    expect(row.source).toBe("SELF");
    expect(row.recordedBy).toBeNull();
  });

  it("marks an admin adding somebody, and names the admin", async () => {
    const admin = await createAdmin("مسؤول");
    await signInAsAdmin(admin);
    const member = await makeMember({ fullName: "سالم", age: "البدريين", status: "ACTIVE" });
    const activity = await anActivity();

    expect(
      (
        await ADMIN_REGISTER(
          post(`/api/admin/activities/${activity.id}/register`, { userId: member.userId }),
          withId(activity.id),
        )
      ).status,
    ).toBe(200);

    const row = await rowFor(member.userId, activity.id);
    expect(row.source).toBe("ADMIN");
    expect(row.recordedBy).toBe("مسؤول");
  });

  it("says the admin put them there when one adds somebody who was refused", async () => {
    const admin = await createAdmin("مسؤول");
    await signInAsAdmin(admin);
    const member = await makeMember({ fullName: "أحمد", age: "البدريين", status: "ACTIVE" });
    const activity = await anActivity();
    await prisma.activityRegistration.create({
      data: {
        userId: member.userId,
        activityId: activity.id,
        status: "REJECTED",
        source: "SELF",
      },
    });

    await ADMIN_REGISTER(
      post(`/api/admin/activities/${activity.id}/register`, { userId: member.userId }),
      withId(activity.id),
    );

    const row = await rowFor(member.userId, activity.id);
    expect(row.source).toBe("ADMIN");
    expect(row.recordedBy).toBe("مسؤول");
  });

  it("says it is their own doing when a member asks again after being refused", async () => {
    const user = await createUser();
    await signInAs(user);
    const member = await anApprovedMemberOf(user, "الشيخ");
    const activity = await anActivity();
    await prisma.activityRegistration.create({
      data: {
        userId: member.userId,
        activityId: activity.id,
        status: "REJECTED",
        source: "ADMIN",
        recordedBy: "مسؤول",
      },
    });

    await SELF_REGISTER(
      post("/api/activities/register", { activityId: activity.id, userId: member.userId }),
    );

    const row = await rowFor(member.userId, activity.id);
    expect(row.source).toBe("SELF");
    expect(row.recordedBy).toBeNull();
  });
});

describe("reviewing a registration", () => {
  beforeEach(async () => {
    await resetDb();
    await signInAsAdmin(await createAdmin("مسؤول"));
  });

  it("leaves how it came about alone when approving", async () => {
    const member = await makeMember({ fullName: "محمد", age: "البدريين", status: "ACTIVE" });
    const activity = await anActivity();
    const registration = await prisma.activityRegistration.create({
      data: {
        userId: member.userId,
        activityId: activity.id,
        status: "PENDING",
        source: "SELF",
      },
    });

    const res = await REVIEW(
      patch(`/api/admin/activities/${activity.id}/register`, {
        registrationId: registration.id,
        status: "ACTIVE",
      }),
      withId(activity.id),
    );

    expect(res.status).toBe(200);
    const row = await rowFor(member.userId, activity.id);
    expect(row.status).toBe("ACTIVE");
    expect(row.source).toBe("SELF");
    expect(row.recordedBy).toBeNull();
  });

  it("leaves a row that predates the record unknown rather than guessing", async () => {
    const member = await makeMember({ fullName: "سالم", age: "البدريين", status: "ACTIVE" });
    const activity = await anActivity();
    const registration = await prisma.activityRegistration.create({
      data: { userId: member.userId, activityId: activity.id, status: "PENDING" },
    });

    await REVIEW(
      patch(`/api/admin/activities/${activity.id}/register`, {
        registrationId: registration.id,
        status: "ACTIVE",
      }),
      withId(activity.id),
    );

    const row = await rowFor(member.userId, activity.id);
    expect(row.source).toBeNull();
    expect(row.recordedBy).toBeNull();
  });
});
