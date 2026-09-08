import { describe, it, expect, beforeEach } from "vitest";
import { POST } from "@/app/api/admin/activities/[id]/register/route";
import { prisma } from "@/lib/prisma";
import {
  resetDb,
  post,
  createAdmin,
  signInAsAdmin,
  withId,
  makeMember,
  createUser,
} from "./helpers";
import { activities } from "@/lib/messages";
import { runningYear } from "@/lib/membershipYear";

async function anActivity() {
  return prisma.activity.create({
    data: { title: "دوري القرية", description: "بطولة", isOpen: true },
  });
}

async function anAccount(fullName: string) {
  return makeMember({ fullName, age: "البدريين", status: "ACTIVE" });
}

function register(activityId: string, accountId: string) {
  return POST(
    post(`/api/admin/activities/${activityId}/register`, { userId: accountId }),
    withId(activityId),
  );
}

describe("an admin registering somebody to an activity", () => {
  beforeEach(async () => {
    await resetDb();
    await signInAsAdmin(await createAdmin());
  });

  it("refuses an account sent as memberId", async () => {
    const activity = await anActivity();
    const account = await anAccount("محمد");

    const res = await POST(
      post(`/api/admin/activities/${activity.id}/register`, { memberId: account.userId }),
      withId(activity.id),
    );

    expect(res.status).toBe(400);
    expect(await prisma.activityRegistration.count()).toBe(0);
  });

  it("registers an account that has never been registered", async () => {
    const activity = await anActivity();
    const account = await anAccount("محمد");

    expect((await register(activity.id, account.userId)).status).toBe(200);

    const row = await prisma.activityRegistration.findUniqueOrThrow({
      where: { userId_activityId: { userId: account.userId, activityId: activity.id } },
    });
    expect(row.status).toBe("ACTIVE");
  });

  it("registers an account that already has a row", async () => {
    const activity = await anActivity();
    const account = await anAccount("أحمد");
    await prisma.activityRegistration.create({
      data: {
        userId: account.userId,
        activityId: activity.id,
        status: "REJECTED",
        rejectionReason: "لا يوجد مكان",
      },
    });

    expect((await register(activity.id, account.userId)).status).toBe(200);

    const row = await prisma.activityRegistration.findUniqueOrThrow({
      where: { userId_activityId: { userId: account.userId, activityId: activity.id } },
    });
    expect(row).toMatchObject({ status: "ACTIVE", rejectionReason: null });
    expect(await prisma.activityRegistration.count({ where: { activityId: activity.id } })).toBe(1);
  });
});

describe("the same membership rule the member is held to", () => {
  beforeEach(async () => {
    await resetDb();
    await signInAsAdmin(await createAdmin());
  });

  async function refused(over: Record<string, unknown>) {
    const activity = await anActivity();
    const account = await makeMember({ fullName: "محمد", age: "البدريين", ...over });
    const res = await register(activity.id, account.userId);
    return { status: res.status, error: (await res.json()).error };
  }

  it("refuses an application that is still waiting, and says which it is", async () => {
    const { status, error } = await refused({ status: "PENDING" });

    expect(status).toBe(403);
    expect(error).toBe(activities.membershipNotApproved);
    expect(await prisma.activityRegistration.count()).toBe(0);
  });

  it("refuses an application that was turned down", async () => {
    const { status, error } = await refused({ status: "REJECTED" });

    expect(status).toBe(403);
    expect(error).toBe(activities.membershipNotApproved);
  });

  it("refuses somebody who has stopped renewing, and says so", async () => {
    const { status, error } = await refused({
      status: "ACTIVE",
      membershipYear: runningYear() - 1,
    });

    expect(status).toBe(403);
    expect(error).toBe(activities.membershipBehind);
  });

  it("refuses a membership that was ended, and says so", async () => {
    const activity = await anActivity();
    const account = await makeMember({ fullName: "محمد", age: "البدريين", status: "ACTIVE" });
    await prisma.membership.updateMany({
      where: { userId: account.userId },
      data: { endedAt: new Date() },
    });

    const res = await register(activity.id, account.userId);

    expect(res.status).toBe(403);
    expect((await res.json()).error).toBe(activities.membershipEnded);
  });

  it("refuses an account that never applied", async () => {
    const activity = await anActivity();
    const account = await createUser("36000099");

    expect((await register(activity.id, account.id)).status).toBe(404);
    expect(await prisma.activityRegistration.count()).toBe(0);
  });
});
