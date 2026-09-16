import { describe, it, expect, beforeEach } from "vitest";
import { GET as LIST, POST as CREATE_MATCH } from "@/app/api/admin/activities/[id]/matches/route";
import { PATCH as EDIT_MATCH } from "@/app/api/admin/matches/[matchId]/route";
import { prisma } from "@/lib/prisma";
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

const START = new Date("2026-09-15T00:00:00.000Z");

async function tournament() {
  return prisma.activity.create({
    data: {
      title: "كأس الترتيب",
      description: "بطولة",
      isTournament: true,
      format: "GROUPS_THEN_KNOCKOUT",
      startsAt: START,
      endsAt: new Date("2026-09-21T00:00:00.000Z"),
    },
  });
}

async function team(activityId: string, name: string) {
  return prisma.team.create({ data: { activityId, name } });
}

async function listDates(id: string) {
  const body = await (await LIST(get(`/api/admin/activities/${id}/matches`), withId(id))).json();
  return body.matches.map((m: { matchDate: string | null }) => m.matchDate);
}

function ascending(dates: (string | null)[]) {
  return dates.every((d, i) => i === 0 || String(dates[i - 1]) <= String(d));
}

describe("the admin matches list", () => {
  beforeEach(async () => {
    await resetDb();
    await signInAsAdmin(await createAdmin());
  });

  it("stays in kick-off order after a match is moved to another day", async () => {
    const activity = await tournament();
    const a = await team(activity.id, "الأول");
    const b = await team(activity.id, "الثاني");
    const c = await team(activity.id, "الثالث");
    const d = await team(activity.id, "الرابع");

    const first = await prisma.match.create({
      data: {
        activityId: activity.id,
        homeTeamId: a.id,
        awayTeamId: b.id,
        matchDate: new Date("2026-09-15T18:00:00.000Z"),
        order: 1,
      },
    });
    const second = await prisma.match.create({
      data: {
        activityId: activity.id,
        homeTeamId: c.id,
        awayTeamId: d.id,
        matchDate: new Date("2026-09-16T18:00:00.000Z"),
        order: 2,
      },
    });

    expect(ascending(await listDates(activity.id))).toBe(true);

    await EDIT_MATCH(
      patch(`/api/admin/matches/${first.id}`, { matchDate: "2026-09-17T18:00" }),
      withParams({ matchId: first.id }),
    );

    expect(second.id).toBeTruthy();
    expect(ascending(await listDates(activity.id))).toBe(true);
  });

  it("puts a newly added early match in its place, not at the end", async () => {
    const activity = await tournament();
    const a = await team(activity.id, "الأول");
    const b = await team(activity.id, "الثاني");
    const c = await team(activity.id, "الثالث");
    const d = await team(activity.id, "الرابع");

    await prisma.match.create({
      data: {
        activityId: activity.id,
        homeTeamId: a.id,
        awayTeamId: b.id,
        matchDate: new Date("2026-09-18T18:00:00.000Z"),
        order: 1,
      },
    });

    await CREATE_MATCH(
      post(`/api/admin/activities/${activity.id}/matches`, {
        firstTeamId: c.id,
        secondTeamId: d.id,
        matchDate: "2026-09-16T17:00",
      }),
      withId(activity.id),
    );

    expect(ascending(await listDates(activity.id))).toBe(true);
  });
});
