import { describe, it, expect, beforeEach } from "vitest";
import { GET as PROFILE } from "@/app/api/admin/members/[id]/profile/route";
import { prisma } from "@/lib/prisma";
import { resetDb, get, createAdmin, signInAsAdmin, withId } from "./helpers";

function ask(id: string) {
  return [get(`/api/admin/members/${id}/profile`), withId(id)] as const;
}

async function aMember(fullName = "محمد") {
  return prisma.member.create({
    data: {
      user: { create: {} },
      fullName,
      age: "البدريين",
      paymentMethod: "بنكيلي",
      status: "ACTIVE",
    },
  });
}

describe("a member's whole file, in one answer", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("refuses an anonymous caller", async () => {
    const member = await aMember();

    expect((await PROFILE(...ask(member.id))).status).toBe(401);
  });

  it("says not found for an id that is not a member", async () => {
    await signInAsAdmin(await createAdmin());

    expect((await PROFILE(...ask("nope"))).status).toBe(404);
  });

  it("brings the activities, the teams and the donations together", async () => {
    await signInAsAdmin(await createAdmin());
    const member = await aMember();
    const activity = await prisma.activity.create({
      data: { title: "دوري", description: "d", isTournament: true },
    });
    await prisma.activityRegistration.create({
      data: { memberId: member.id, activityId: activity.id, status: "ACTIVE" },
    });
    const team = await prisma.team.create({ data: { activityId: activity.id, name: "النجم" } });
    await prisma.teamMember.create({
      data: { teamId: team.id, memberId: member.id, status: "ACTIVE" },
    });
    await prisma.donation.create({
      data: { amount: 500, memberId: member.id, status: "ACTIVE", source: "SELF" },
    });

    const body = await (await PROFILE(...ask(member.id))).json();

    expect(body.member.registrations).toHaveLength(1);
    expect(body.member.teamMemberships[0].team.name).toBe("النجم");
    expect(body.member.donations[0].amount).toBe(500);
  });

  // The trail was already written on every change; this is the first thing
  // that can read one record's share of it.
  it("carries only this member's own history", async () => {
    await signInAsAdmin(await createAdmin());
    const mine = await aMember("محمد");
    const other = await aMember("أحمد");
    await prisma.auditLog.create({
      data: {
        adminUsername: "admin",
        action: "APPROVE_MEMBER",
        targetType: "Member",
        targetId: mine.id,
      },
    });
    await prisma.auditLog.create({
      data: {
        adminUsername: "admin",
        action: "REJECT_MEMBER",
        targetType: "Member",
        targetId: other.id,
      },
    });

    const body = await (await PROFILE(...ask(mine.id))).json();

    expect(body.history).toHaveLength(1);
    expect(body.history[0].action).toBe("APPROVE_MEMBER");
  });
});
