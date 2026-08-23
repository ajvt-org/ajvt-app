import { describe, it, expect, beforeEach } from "vitest";
import { GET as DAYS, POST as ADD_DAY } from "@/app/api/admin/activities/[id]/days/route";
import {
  PATCH as SET_REST,
  DELETE as REMOVE_DAY,
} from "@/app/api/admin/activities/[id]/days/[dayId]/route";
import { POST as ASSIGN } from "@/app/api/admin/activities/[id]/days/assign/route";
import { prisma } from "@/lib/prisma";
import { resetDb, get, post, patch, del, createAdmin, signInAsAdmin, withId } from "./helpers";

const START = new Date("2026-08-24T00:00:00.000Z");

function withIds(id: string, dayId: string) {
  return { params: Promise.resolve({ id, dayId }) };
}

async function tournament() {
  return prisma.activity.create({
    data: {
      title: "بطولة الأيام",
      description: "بطولة",
      isTournament: true,
      format: "GROUPS_THEN_KNOCKOUT",
      startsAt: START,
      endsAt: new Date("2026-08-27T00:00:00.000Z"),
    },
  });
}

async function teamPair(activityId: string) {
  const home = await prisma.team.create({ data: { activityId, name: "الأول" } });
  const away = await prisma.team.create({ data: { activityId, name: "الثاني" } });
  return { home, away };
}

async function matchOn(activityId: string, iso: string) {
  const { home, away } = await teamPair(activityId);
  return prisma.match.create({
    data: {
      activityId,
      homeTeamId: home.id,
      awayTeamId: away.id,
      matchDate: new Date(iso),
    },
  });
}

async function read(id: string) {
  return (await DAYS(get(`/api/admin/activities/${id}/days`), withId(id))).json();
}

describe("the tournament day spine", () => {
  beforeEach(async () => {
    await resetDb();
    await signInAsAdmin(await createAdmin());
  });

  it("adopts a hand-dated tournament, gaps becoming rest days", async () => {
    const a = await tournament();
    await matchOn(a.id, "2026-08-24T16:00:00.000Z");
    await matchOn(a.id, "2026-08-26T17:00:00.000Z");

    const body = await read(a.id);

    expect(body.days.map((d: { isRest: boolean }) => d.isRest)).toEqual([false, true, false]);
    expect(body.days[0].matches).toHaveLength(1);
    expect(body.days[2].matches).toHaveLength(1);
    const activity = await prisma.activity.findUniqueOrThrow({ where: { id: a.id } });
    expect(activity.endsAt?.toISOString()).toBe("2026-08-26T00:00:00.000Z");
  });

  it("lays plain days over the announced span when nothing is dated", async () => {
    const a = await tournament();

    const body = await read(a.id);

    expect(body.days).toHaveLength(4);
    expect(body.days.every((d: { isRest: boolean }) => !d.isRest)).toBe(true);
  });

  it("shifts everything after an inserted rest day, end date included", async () => {
    const a = await tournament();
    await matchOn(a.id, "2026-08-24T16:00:00.000Z");
    const late = await matchOn(a.id, "2026-08-25T17:00:00.000Z");
    await read(a.id);

    const res = await ADD_DAY(
      post(`/api/admin/activities/${a.id}/days`, { position: 2, isRest: true }),
      withId(a.id),
    );

    expect(res.status).toBe(201);
    const moved = await prisma.match.findUniqueOrThrow({ where: { id: late.id } });
    expect(moved.matchDate?.toISOString()).toBe("2026-08-26T17:00:00.000Z");
    const activity = await prisma.activity.findUniqueOrThrow({ where: { id: a.id } });
    expect(activity.endsAt?.toISOString()).toBe("2026-08-26T00:00:00.000Z");
  });

  it("pulls everything back when the rest day goes away", async () => {
    const a = await tournament();
    await matchOn(a.id, "2026-08-24T16:00:00.000Z");
    const late = await matchOn(a.id, "2026-08-25T17:00:00.000Z");
    await read(a.id);
    await ADD_DAY(
      post(`/api/admin/activities/${a.id}/days`, { position: 2, isRest: true }),
      withId(a.id),
    );
    const body = await read(a.id);
    const rest = body.days.find((d: { isRest: boolean }) => d.isRest);

    const res = await REMOVE_DAY(
      del(`/api/admin/activities/${a.id}/days/${rest.id}`),
      withIds(a.id, rest.id),
    );

    expect(res.status).toBe(200);
    const moved = await prisma.match.findUniqueOrThrow({ where: { id: late.id } });
    expect(moved.matchDate?.toISOString()).toBe("2026-08-25T17:00:00.000Z");
  });

  it("refuses to remove a day that still has matches", async () => {
    const a = await tournament();
    await matchOn(a.id, "2026-08-24T16:00:00.000Z");
    const body = await read(a.id);

    const res = await REMOVE_DAY(
      del(`/api/admin/activities/${a.id}/days/${body.days[0].id}`),
      withIds(a.id, body.days[0].id),
    );

    expect(res.status).toBe(409);
  });

  it("refuses to rest a day that still has matches", async () => {
    const a = await tournament();
    await matchOn(a.id, "2026-08-24T16:00:00.000Z");
    const body = await read(a.id);

    const res = await SET_REST(
      patch(`/api/admin/activities/${a.id}/days/${body.days[0].id}`, { isRest: true }),
      withIds(a.id, body.days[0].id),
    );

    expect(res.status).toBe(409);
  });

  it("puts an assigned match on its day at the chosen time", async () => {
    const a = await tournament();
    const body = await read(a.id);
    const { home, away } = await teamPair(a.id);
    const match = await prisma.match.create({
      data: { activityId: a.id, homeTeamId: home.id, awayTeamId: away.id },
    });

    const res = await ASSIGN(
      post(`/api/admin/activities/${a.id}/days/assign`, {
        matchId: match.id,
        dayId: body.days[2].id,
        time: "17:30",
      }),
      withId(a.id),
    );

    expect(res.status).toBe(200);
    const saved = await prisma.match.findUniqueOrThrow({ where: { id: match.id } });
    expect(saved.matchDate?.toISOString()).toBe("2026-08-26T17:30:00.000Z");
    expect(saved.dayId).toBe(body.days[2].id);
  });

  it("refuses to schedule a match onto a rest day", async () => {
    const a = await tournament();
    await read(a.id);
    const added = await (
      await ADD_DAY(
        post(`/api/admin/activities/${a.id}/days`, { position: 1, isRest: true }),
        withId(a.id),
      )
    ).json();
    const { home, away } = await teamPair(a.id);
    const match = await prisma.match.create({
      data: { activityId: a.id, homeTeamId: home.id, awayTeamId: away.id },
    });

    const res = await ASSIGN(
      post(`/api/admin/activities/${a.id}/days/assign`, {
        matchId: match.id,
        dayId: added.day.id,
      }),
      withId(a.id),
    );

    expect(res.status).toBe(409);
  });
});
