import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { SCOPED_ROLE } from "@/lib/activityAccess";
import {
  resetDb,
  get,
  post,
  patch,
  createAdmin,
  signInAsAdmin,
  withId,
  withParams,
} from "./helpers";

import { GET as LIST_ACTIVITIES } from "@/app/api/admin/activities/route";
import { GET as DETAIL } from "@/app/api/admin/activities/[id]/detail/route";
import { GET as ROSTER } from "@/app/api/admin/activities/[id]/roster/route";
import {
  GET as LIST_TEAMS,
  POST as CREATE_TEAM,
} from "@/app/api/admin/activities/[id]/teams/route";
import {
  GET as LIST_GROUPS,
  POST as CREATE_GROUP,
} from "@/app/api/admin/activities/[id]/groups/route";
import { GET as LIST_MATCHES } from "@/app/api/admin/activities/[id]/matches/route";
import { GET as FINANCE } from "@/app/api/admin/activities/[id]/finance/route";
import { POST as DRAW } from "@/app/api/admin/activities/[id]/bracket/draw/route";
import { PATCH as UPDATE_MATCH } from "@/app/api/admin/matches/[matchId]/route";
import { PATCH as UPDATE_TEAM } from "@/app/api/admin/teams/[teamId]/route";
import { PATCH as UPDATE_GROUP } from "@/app/api/admin/groups/[groupId]/route";
import { GET as LIST_MEMBERS } from "@/app/api/admin/members/route";
import { GET as FINANCE_SUMMARY } from "@/app/api/admin/finance/summary/route";

async function activity(title: string) {
  return prisma.activity.create({
    data: { title, description: "وصف", isTournament: true, format: "KNOCKOUT" },
  });
}

async function scopedAdmin(activityId: string) {
  const admin = await createAdmin("scoped", SCOPED_ROLE);
  await prisma.adminActivity.create({ data: { adminId: admin.id, activityId } });
  await signInAsAdmin(admin);
  return admin;
}

describe("a scoped admin", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("sees only the activities it is attached to", async () => {
    const mine = await activity("القافلة الصحية");
    await activity("البطولة الكبرى");
    await scopedAdmin(mine.id);

    const { activities } = await (await LIST_ACTIVITIES()).json();

    expect(activities.map((a: { title: string }) => a.title)).toEqual(["القافلة الصحية"]);
  });

  it("reaches its own activity across every read route", async () => {
    const mine = await activity("القافلة الصحية");
    await scopedAdmin(mine.id);

    for (const [name, handler] of [
      ["detail", DETAIL],
      ["roster", ROSTER],
      ["teams", LIST_TEAMS],
      ["groups", LIST_GROUPS],
      ["matches", LIST_MATCHES],
      ["finance", FINANCE],
    ] as const) {
      const res = await handler(get(`/api/admin/activities/${mine.id}/${name}`), withId(mine.id));
      expect([200, 201], `${name} should be allowed`).toContain(res.status);
    }
  });

  it("is refused on another activity across every read route", async () => {
    const mine = await activity("القافلة الصحية");
    const theirs = await activity("البطولة الكبرى");
    await scopedAdmin(mine.id);

    for (const [name, handler] of [
      ["detail", DETAIL],
      ["roster", ROSTER],
      ["teams", LIST_TEAMS],
      ["groups", LIST_GROUPS],
      ["matches", LIST_MATCHES],
      ["finance", FINANCE],
    ] as const) {
      const res = await handler(
        get(`/api/admin/activities/${theirs.id}/${name}`),
        withId(theirs.id),
      );
      expect(res.status, `${name} should be refused`).toBe(403);
    }
  });

  it("cannot write to another activity", async () => {
    const mine = await activity("القافلة الصحية");
    const theirs = await activity("البطولة الكبرى");
    await scopedAdmin(mine.id);

    const team = await CREATE_TEAM(
      post(`/api/admin/activities/${theirs.id}/teams`, { name: "فريق" }),
      withId(theirs.id),
    );
    expect(team.status).toBe(403);

    const group = await CREATE_GROUP(
      post(`/api/admin/activities/${theirs.id}/groups`, { name: "مجموعة" }),
      withId(theirs.id),
    );
    expect(group.status).toBe(403);

    const draw = await DRAW(
      post(`/api/admin/activities/${theirs.id}/bracket/draw`, {}),
      withId(theirs.id),
    );
    expect(draw.status).toBe(403);

    expect(await prisma.team.count()).toBe(0);
    expect(await prisma.group.count()).toBe(0);
  });

  it("cannot reach another activity through a match, team or group id", async () => {
    const mine = await activity("القافلة الصحية");
    const theirs = await activity("البطولة الكبرى");
    const home = await prisma.team.create({ data: { activityId: theirs.id, name: "أ" } });
    const away = await prisma.team.create({ data: { activityId: theirs.id, name: "ب" } });
    const match = await prisma.match.create({
      data: { activityId: theirs.id, homeTeamId: home.id, awayTeamId: away.id },
    });
    const group = await prisma.group.create({ data: { activityId: theirs.id, name: "المجموعة" } });
    await scopedAdmin(mine.id);

    const byMatch = await UPDATE_MATCH(
      patch(`/api/admin/matches/${match.id}`, { venue: "x" }),
      withParams({ matchId: match.id }),
    );
    expect(byMatch.status).toBe(403);

    const byTeam = await UPDATE_TEAM(
      patch(`/api/admin/teams/${home.id}`, { name: "z" }),
      withParams({ teamId: home.id }),
    );
    expect(byTeam.status).toBe(403);

    const byGroup = await UPDATE_GROUP(
      patch(`/api/admin/groups/${group.id}`, { name: "z" }),
      withParams({ groupId: group.id }),
    );
    expect(byGroup.status).toBe(403);
  });

  it("is shut out of the rest of the back office", async () => {
    const mine = await activity("القافلة الصحية");
    await scopedAdmin(mine.id);

    expect((await LIST_MEMBERS()).status).toBe(403);
    expect((await FINANCE_SUMMARY(get("/api/admin/finance/summary"))).status).toBe(403);
  });

  it("loses access the moment it is detached", async () => {
    const mine = await activity("القافلة الصحية");
    const admin = await scopedAdmin(mine.id);
    expect((await DETAIL(get("/x"), withId(mine.id))).status).toBe(200);

    await prisma.adminActivity.deleteMany({ where: { adminId: admin.id } });

    expect((await DETAIL(get("/x"), withId(mine.id))).status).toBe(403);
  });
});

describe("the existing roles", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("leaves a full admin reaching every activity", async () => {
    const a = await activity("القافلة الصحية");
    await activity("البطولة");
    await signInAsAdmin(await createAdmin("boss", "SUPER"));

    expect((await DETAIL(get("/x"), withId(a.id))).status).toBe(200);
    expect((await (await LIST_ACTIVITIES()).json()).activities).toHaveLength(2);
  });

  it("leaves an activities admin reaching every activity", async () => {
    const a = await activity("القافلة الصحية");
    await activity("البطولة");
    await signInAsAdmin(await createAdmin("acts", "ACTIVITIES"));

    expect((await DETAIL(get("/x"), withId(a.id))).status).toBe(200);
    expect((await (await LIST_ACTIVITIES()).json()).activities).toHaveLength(2);
  });

  it("keeps a members admin out of the activity routes", async () => {
    const a = await activity("القافلة الصحية");
    await signInAsAdmin(await createAdmin("mem", "MEMBERS"));

    expect((await DETAIL(get("/x"), withId(a.id))).status).toBe(403);
  });
});
