import { describe, it, expect, beforeEach } from "vitest";
import { GET as DETAIL } from "@/app/api/admin/activities/[id]/detail/route";
import { prisma } from "@/lib/prisma";
import { resetDb, get, createAdmin, signInAsAdmin } from "./helpers";

function ask(id: string) {
  return [get(`/api/admin/activities/${id}/detail`), { params: Promise.resolve({ id }) }] as const;
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
    const member = await prisma.member.create({
      data: {
        fullName: "محمد",
        phone: "22334455",
        age: "البدريين",
        paymentMethod: "بنكيلي",
        status: "ACTIVE",
      },
    });
    await prisma.activityRegistration.create({
      data: { memberId: member.id, activityId: activity.id, status: "ACTIVE" },
    });
    const team = await prisma.team.create({ data: { activityId: activity.id, name: "النجم" } });
    await prisma.teamMember.create({
      data: { teamId: team.id, memberId: member.id, status: "ACTIVE" },
    });

    const body = await (await DETAIL(...ask(activity.id))).json();

    expect(body.activity.registrations).toHaveLength(1);
    expect(body.activity.registrations[0].member.fullName).toBe("محمد");
    expect(body.activity.teams[0]._count.members).toBe(1);
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
