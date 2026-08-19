import { describe, it, expect, beforeEach } from "vitest";
import { POST as CREATE_ACTIVITY } from "@/app/api/admin/activities/route";
import { POST as CREATE_TEAM } from "@/app/api/admin/activities/[id]/teams/route";
import { POST as ADD_MEMBER } from "@/app/api/admin/teams/[teamId]/members/route";
import { POST as DRAW } from "@/app/api/admin/activities/[id]/bracket/draw/route";
import { prisma } from "@/lib/prisma";
import { resetDb, post, createAdmin, signInAsAdmin, withId, withParams } from "./helpers";

async function doublesActivity(teamSize: number | null = 2) {
  const res = await CREATE_ACTIVITY(
    post("/api/admin/activities", {
      title: "مارياس",
      description: "بطولة أزواج",
      isTournament: true,
      format: "KNOCKOUT",
      teamSize,
    }),
  );
  return (await res.json()).activity;
}

async function player(activityId: string, fullName: string) {
  const member = await prisma.member.create({
    data: { fullName, age: "البدريين", paymentMethod: "بنكيلي", status: "ACTIVE" },
  });
  await prisma.activityRegistration.create({
    data: { memberId: member.id, activityId, status: "ACTIVE" },
  });
  return member;
}

async function makeTeam(activityId: string, name?: string) {
  const res = await CREATE_TEAM(
    post(`/api/admin/activities/${activityId}/teams`, name === undefined ? {} : { name }),
    withId(activityId),
  );
  return { status: res.status, team: (await res.json()).team };
}

function addMember(teamId: string, memberId: string) {
  return ADD_MEMBER(
    post(`/api/admin/teams/${teamId}/members`, { memberId }),
    withParams({ teamId }),
  );
}

describe("fixed-size teams", () => {
  beforeEach(async () => {
    await resetDb();
    await signInAsAdmin(await createAdmin());
  });

  it("stores the declared team size", async () => {
    const activity = await doublesActivity(2);

    expect(activity.teamSize).toBe(2);
  });

  it("refuses a third member in a pair", async () => {
    const activity = await doublesActivity(2);
    const { team } = await makeTeam(activity.id);
    for (const name of ["أحمد", "محمد"]) {
      const member = await player(activity.id, name);
      expect((await addMember(team.id, member.id)).status).toBe(201);
    }

    const third = await player(activity.id, "سالم");
    const res = await addMember(team.id, third.id);

    expect(res.status).toBe(409);
    expect(await prisma.teamMember.count({ where: { teamId: team.id } })).toBe(2);
  });

  it("keeps an open-size squad open", async () => {
    const activity = await doublesActivity(null);
    const { team } = await makeTeam(activity.id, "النجم");
    for (const name of ["أ", "ب", "ج"]) {
      const member = await player(activity.id, name);
      expect((await addMember(team.id, member.id)).status).toBe(201);
    }

    expect(await prisma.teamMember.count({ where: { teamId: team.id } })).toBe(3);
  });

  it("lets a pair be created without a name", async () => {
    const activity = await doublesActivity(2);

    const { status, team } = await makeTeam(activity.id);

    expect(status).toBe(201);
    expect(team.name).toBe("فريق 1");
  });

  it("still demands a name for an open-size squad", async () => {
    const activity = await doublesActivity(null);

    expect((await makeTeam(activity.id)).status).toBe(400);
  });

  it("refuses the draw while a pair is short, and says which", async () => {
    const activity = await doublesActivity(2);
    const names = [["أحمد", "محمد"], ["علي", "يحيى"], ["سالم", "إبراهيم"], ["عمر"]];
    for (const pair of names) {
      const { team } = await makeTeam(activity.id);
      for (const name of pair) {
        await addMember(team.id, (await player(activity.id, name)).id);
      }
    }

    const res = await DRAW(
      post(`/api/admin/activities/${activity.id}/bracket/draw`, {}),
      withId(activity.id),
    );

    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain("عمر");
    expect(await prisma.match.count()).toBe(0);
  });

  it("runs the draw once every pair is complete", async () => {
    const activity = await doublesActivity(2);
    const names = [
      ["أحمد", "محمد"],
      ["علي", "يحيى"],
      ["سالم", "إبراهيم"],
      ["عمر", "خالد"],
    ];
    for (const pair of names) {
      const { team } = await makeTeam(activity.id);
      for (const name of pair) {
        await addMember(team.id, (await player(activity.id, name)).id);
      }
    }

    const res = await DRAW(
      post(`/api/admin/activities/${activity.id}/bracket/draw`, {}),
      withId(activity.id),
    );

    expect(res.status).toBe(200);
    expect(await prisma.match.count()).toBe(2);
  });
});
