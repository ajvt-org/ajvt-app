import { describe, it, expect, beforeEach } from "vitest";
import { POST as REGISTER } from "@/app/api/activities/register/route";
import { prisma } from "@/lib/prisma";
import { resetDb, post, createUser, signInAs, makeMember } from "./helpers";
import { getAppSettings } from "@/lib/settingsServer";
import { activities } from "@/lib/messages";

async function anActivity(title = "دوري") {
  return prisma.activity.create({
    data: { title, description: "وصف", isOpen: true, autoApprove: true },
  });
}

async function memberOn(year: number, phone?: string) {
  const user = await createUser(phone);
  await signInAs(user);
  return makeMember({
    userId: user.id,
    fullName: "محمد ولد أحمد",
    age: "البدريين",
    paymentMethod: "بنكيلي",
    status: "ACTIVE",
    membershipYear: year,
  });
}

describe("a membership that was never renewed", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("cannot register for a new activity", async () => {
    const { membershipYear } = await getAppSettings();
    const member = await memberOn(membershipYear - 1);
    const activity = await anActivity();

    const res = await REGISTER(
      post("/api/activities/register", { activityId: activity.id, memberId: member.userId }),
    );

    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: activities.membershipBehind });
    expect(await prisma.activityRegistration.count()).toBe(0);
  });

  it("keeps the activities it already joined", async () => {
    const { membershipYear } = await getAppSettings();
    const member = await memberOn(membershipYear - 1);
    const activity = await anActivity();
    await prisma.activityRegistration.create({
      data: {
        userId: member.userId,
        activityId: activity.id,
        status: "ACTIVE",
      },
    });

    const still = await prisma.activityRegistration.findFirstOrThrow();
    expect(still.status).toBe("ACTIVE");
  });

  it("registers freely once the year is paid", async () => {
    const { membershipYear } = await getAppSettings();
    const member = await memberOn(membershipYear);
    const activity = await anActivity();

    const res = await REGISTER(
      post("/api/activities/register", { activityId: activity.id, memberId: member.userId }),
    );

    expect(res.status).toBe(200);
    expect(await prisma.activityRegistration.count()).toBe(1);
  });

  it("counts a year paid in advance as paid, not lapsed", async () => {
    const { membershipYear } = await getAppSettings();
    const member = await memberOn(membershipYear + 1);
    const activity = await anActivity();

    expect(
      (
        await REGISTER(
          post("/api/activities/register", { activityId: activity.id, memberId: member.userId }),
        )
      ).status,
    ).toBe(200);
  });
});
