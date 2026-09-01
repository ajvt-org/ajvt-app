import { describe, it, expect, beforeEach } from "vitest";
import { GET as DETAIL } from "@/app/api/admin/activities/[id]/detail/route";
import { prisma } from "@/lib/prisma";
import { resetDb, get, createAdmin, signInAsAdmin, withId, makeMember } from "./helpers";

function ask(id: string) {
  return [get(`/api/admin/activities/${id}/detail`), withId(id)] as const;
}

async function anActivity() {
  return prisma.activity.create({
    data: { title: "دوري القرية", description: "بطولة", isTournament: true },
  });
}

describe("one activity with everything hanging off it", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("refuses an anonymous caller", async () => {
    const activity = await anActivity();

    expect((await DETAIL(...ask(activity.id))).status).toBe(401);
  });

  it("says not found for an id that is not an activity", async () => {
    await signInAsAdmin(await createAdmin());

    expect((await DETAIL(...ask("nope"))).status).toBe(404);
  });

  it("brings the registrations, the teams and the counts together", async () => {
    await signInAsAdmin(await createAdmin());
    const activity = await anActivity();
    const member = await makeMember({
      fullName: "محمد",
      age: "البدريين",
      paymentMethod: "بنكيلي",
      status: "ACTIVE",
    });
    await prisma.activityRegistration.create({
      data: {
        userId: member.userId,
        activityId: activity.id,
        status: "ACTIVE",
      },
    });
    const team = await prisma.team.create({ data: { activityId: activity.id, name: "النجم" } });
    await prisma.teamMember.create({
      data: { teamId: team.id, userId: member.userId, status: "ACTIVE" },
    });

    const body = await (await DETAIL(...ask(activity.id))).json();

    expect(body.activity.registrations).toHaveLength(1);
    expect(body.activity.registrations[0].member.fullName).toBe("محمد");
    expect(body.activity.teams[0]._count.members).toBe(1);
  });

  it("carries what the review needs, the proof and the member's phone", async () => {
    await signInAsAdmin(await createAdmin());
    const activity = await anActivity();
    const user = await prisma.user.create({ data: { phone: "36112233", password: "x" } });
    const member = await makeMember({
      userId: user.id,
      fullName: "أحمد",
      age: "البدريين",
      paymentMethod: "بنكيلي",
      status: "ACTIVE",
    });
    await prisma.activityRegistration.create({
      data: {
        userId: member.userId,
        activityId: activity.id,
        status: "PENDING",
        paymentProof: "proof-1.webp",
      },
    });

    const body = await (await DETAIL(...ask(activity.id))).json();

    expect(body.activity.registrations[0]).toMatchObject({
      status: "PENDING",
      paymentProof: "proof-1.webp",
      rejectionReason: null,
    });
    expect(body.activity.registrations[0].member.phone).toBe("36112233");
  });

  it("carries only this activity's own history", async () => {
    await signInAsAdmin(await createAdmin());
    const mine = await anActivity();
    const other = await anActivity();
    await prisma.auditLog.create({
      data: {
        adminUsername: "admin",
        action: "UPDATE_ACTIVITY",
        targetType: "Activity",
        targetId: mine.id,
      },
    });
    await prisma.auditLog.create({
      data: {
        adminUsername: "admin",
        action: "DELETE_ACTIVITY",
        targetType: "Activity",
        targetId: other.id,
      },
    });

    const body = await (await DETAIL(...ask(mine.id))).json();

    expect(body.history).toHaveLength(1);
    expect(body.history[0].action).toBe("UPDATE_ACTIVITY");
  });
});

describe("the team a registrant belongs to", () => {
  beforeEach(async () => {
    await resetDb();
    await signInAsAdmin(await createAdmin());
  });

  async function aRegistrant(activityId: string, fullName: string) {
    const member = await makeMember({ fullName, age: "البدريين", status: "ACTIVE" });
    await prisma.activityRegistration.create({
      data: { userId: member.userId, activityId, status: "ACTIVE" },
    });
    return member;
  }

  it("names the team of a registrant who is on one", async () => {
    const activity = await anActivity();
    const member = await aRegistrant(activity.id, "محمد");
    const team = await prisma.team.create({
      data: { activityId: activity.id, name: "الشناقطة" },
    });
    await prisma.teamMember.create({ data: { teamId: team.id, userId: member.userId } });

    const body = await (await DETAIL(...ask(activity.id))).json();

    expect(body.activity.registrations[0].team).toEqual({ id: team.id, name: "الشناقطة" });
  });

  it("says nothing for a registrant on no team", async () => {
    const activity = await anActivity();
    await aRegistrant(activity.id, "سالم");

    const body = await (await DETAIL(...ask(activity.id))).json();

    expect(body.activity.registrations[0].team).toBeNull();
  });

  it("leaves out a join that is still waiting on the admin", async () => {
    const activity = await anActivity();
    const member = await aRegistrant(activity.id, "أحمد");
    const team = await prisma.team.create({
      data: { activityId: activity.id, name: "أهل الساحل" },
    });
    await prisma.teamMember.create({
      data: { teamId: team.id, userId: member.userId, status: "PENDING" },
    });

    const body = await (await DETAIL(...ask(activity.id))).json();

    expect(body.activity.registrations[0].team).toBeNull();
  });

  it("keeps a team from another activity out of it", async () => {
    const activity = await anActivity();
    const other = await anActivity();
    const member = await aRegistrant(activity.id, "الشيخ");
    const team = await prisma.team.create({ data: { activityId: other.id, name: "فريق آخر" } });
    await prisma.teamMember.create({ data: { teamId: team.id, userId: member.userId } });

    const body = await (await DETAIL(...ask(activity.id))).json();

    expect(body.activity.registrations[0].team).toBeNull();
  });
});

describe("what the detail says about how a registration came about", () => {
  beforeEach(async () => {
    await resetDb();
    await signInAsAdmin(await createAdmin());
  });

  it("carries how it came about and who recorded it", async () => {
    const activity = await anActivity();
    const member = await makeMember({ fullName: "محمد", age: "البدريين", status: "ACTIVE" });
    await prisma.activityRegistration.create({
      data: {
        userId: member.userId,
        activityId: activity.id,
        status: "ACTIVE",
        source: "ADMIN",
        recordedBy: "مسؤول",
      },
    });

    const body = await (await DETAIL(...ask(activity.id))).json();

    expect(body.activity.registrations[0]).toMatchObject({
      source: "ADMIN",
      recordedBy: "مسؤول",
    });
  });

  it("leaves a row written before the record with nothing rather than a guess", async () => {
    const activity = await anActivity();
    const member = await makeMember({ fullName: "سالم", age: "البدريين", status: "ACTIVE" });
    await prisma.activityRegistration.create({
      data: { userId: member.userId, activityId: activity.id, status: "ACTIVE" },
    });

    const body = await (await DETAIL(...ask(activity.id))).json();

    expect(body.activity.registrations[0].source).toBeNull();
    expect(body.activity.registrations[0].recordedBy).toBeNull();
  });
});
