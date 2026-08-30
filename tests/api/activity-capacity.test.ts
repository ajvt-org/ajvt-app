import { describe, it, expect, beforeEach } from "vitest";
import { POST as REGISTER } from "@/app/api/activities/register/route";
import { prisma } from "@/lib/prisma";
import { resetDb, post, createUser, signInAs, makeMember } from "./helpers";

async function aFullActivity(capacity = 1) {
  return prisma.activity.create({
    data: { title: "دوري القرية", description: "بطولة", capacity, isOpen: true },
  });
}

async function anActiveMemberOf(user: { id: string }, fullName: string) {
  return makeMember({
    fullName,
    age: "البدريين",
    paymentMethod: "بنكيلي",
    status: "ACTIVE",
    userId: user.id,
  });
}

function ask(activityId: string, memberId: string) {
  return post("/api/activities/register", { activityId, memberId });
}

describe("registering for an activity with a seat limit", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("takes the last seat", async () => {
    const user = await createUser();
    await signInAs(user);
    const activity = await aFullActivity();
    const member = await anActiveMemberOf(user, "محمد");

    expect((await REGISTER(ask(activity.id, member.userId))).status).toBe(200);
  });

  it("refuses once the seats are gone", async () => {
    const taken = await createUser("22000001");
    const holder = await anActiveMemberOf(taken, "أحمد");
    const activity = await aFullActivity();
    await prisma.activityRegistration.create({
      data: {
        userId: holder.userId,
        activityId: activity.id,
        status: "PENDING",
      },
    });

    const user = await createUser("22000002");
    await signInAs(user);
    const member = await anActiveMemberOf(user, "محمد");

    expect((await REGISTER(ask(activity.id, member.userId))).status).toBe(409);
  });

  it("still refuses a member it rejected earlier", async () => {
    const taken = await createUser("22000001");
    const holder = await anActiveMemberOf(taken, "أحمد");
    const activity = await aFullActivity();
    await prisma.activityRegistration.create({
      data: {
        userId: holder.userId,
        activityId: activity.id,
        status: "PENDING",
      },
    });

    const user = await createUser("22000002");
    await signInAs(user);
    const member = await anActiveMemberOf(user, "محمد");
    await prisma.activityRegistration.create({
      data: {
        userId: member.userId,
        activityId: activity.id,
        status: "REJECTED",
      },
    });

    expect((await REGISTER(ask(activity.id, member.userId))).status).toBe(409);
    expect(
      await prisma.activityRegistration.count({
        where: { activityId: activity.id, status: { not: "REJECTED" } },
      }),
    ).toBe(1);
  });

  it("lets a rejected member back in when a seat is free", async () => {
    const activity = await aFullActivity();
    const user = await createUser();
    await signInAs(user);
    const member = await anActiveMemberOf(user, "محمد");
    await prisma.activityRegistration.create({
      data: {
        userId: member.userId,
        activityId: activity.id,
        status: "REJECTED",
      },
    });

    expect((await REGISTER(ask(activity.id, member.userId))).status).toBe(200);
    const row = await prisma.activityRegistration.findFirstOrThrow({
      where: { userId: member.userId, activityId: activity.id },
    });
    expect(row.status).toBe("PENDING");
  });

  it("refuses a second registration by the same member", async () => {
    const activity = await prisma.activity.create({
      data: { title: "دوري القرية", description: "بطولة", isOpen: true },
    });
    const user = await createUser();
    await signInAs(user);
    const member = await anActiveMemberOf(user, "محمد");

    expect((await REGISTER(ask(activity.id, member.userId))).status).toBe(200);
    expect((await REGISTER(ask(activity.id, member.userId))).status).toBe(409);
  });
});
