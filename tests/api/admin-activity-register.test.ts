import { describe, it, expect, beforeEach } from "vitest";
import { POST } from "@/app/api/admin/activities/[id]/register/route";
import { prisma } from "@/lib/prisma";
import { resetDb, post, createAdmin, signInAsAdmin, withId, makeMember } from "./helpers";

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
