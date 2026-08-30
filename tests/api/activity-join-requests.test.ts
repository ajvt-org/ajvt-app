import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { GET } from "@/app/api/admin/activities/route";
import { resetDb, get, createAdmin, createUsers, signInAsAdmin, makeMember } from "./helpers";

async function aTournament(title = "كأس الرابطة") {
  return prisma.activity.create({
    data: { title, description: "بطولة", isTournament: true, isOpen: true },
  });
}

async function aTeamWith(activityId: string, name: string, statuses: string[]) {
  const team = await prisma.team.create({ data: { activityId, name } });
  for (const [i, status] of statuses.entries()) {
    const [user] = await createUsers(1);
    const member = await makeMember({
      fullName: `${name} ${i}`,
      age: "البدريين",
      paymentMethod: "بنكيلي",
      status: "ACTIVE",
      userId: user.id,
    });
    await prisma.teamMember.create({
      data: {
        teamId: team.id,
        userId: member.userId,
        status: status as "PENDING",
      },
    });
  }
  return team;
}

async function listed() {
  const body = await (await GET(get("/api/admin/activities"))).json();
  return body.activities as { title: string; pendingJoinRequests: number }[];
}

describe("join requests waiting on an activity", () => {
  beforeEach(async () => {
    await resetDb();
    await signInAsAdmin(await createAdmin());
  });

  it("counts the ones still waiting", async () => {
    const activity = await aTournament();
    await aTeamWith(activity.id, "الشناقطة", ["PENDING", "PENDING"]);

    expect((await listed())[0].pendingJoinRequests).toBe(2);
  });

  it("leaves out the players already accepted", async () => {
    const activity = await aTournament();
    await aTeamWith(activity.id, "الشناقطة", ["ACTIVE", "PENDING"]);

    expect((await listed())[0].pendingJoinRequests).toBe(1);
  });

  it("adds up across the teams of one activity", async () => {
    const activity = await aTournament();
    await aTeamWith(activity.id, "الشناقطة", ["PENDING"]);
    await aTeamWith(activity.id, "الفرسان", ["PENDING"]);

    expect((await listed())[0].pendingJoinRequests).toBe(2);
  });

  it("keeps each activity's count to itself", async () => {
    const first = await aTournament("كأس الرابطة");
    const second = await aTournament("بطولة الناشئين");
    await aTeamWith(first.id, "الشناقطة", ["PENDING"]);
    await aTeamWith(second.id, "النجوم", ["ACTIVE"]);

    const rows = await listed();
    const byTitle = Object.fromEntries(rows.map((r) => [r.title, r.pendingJoinRequests]));
    expect(byTitle["كأس الرابطة"]).toBe(1);
    expect(byTitle["بطولة الناشئين"]).toBe(0);
  });

  it("is zero for an activity with no teams at all", async () => {
    await prisma.activity.create({ data: { title: "حملة", description: "تنظيف" } });

    expect((await listed())[0].pendingJoinRequests).toBe(0);
  });
});
