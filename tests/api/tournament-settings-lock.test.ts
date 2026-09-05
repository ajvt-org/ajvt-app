import { describe, it, expect, beforeEach } from "vitest";
import { PATCH as UPDATE_ACTIVITY } from "@/app/api/admin/activities/[id]/route";
import { GET as ACTIVITY_DETAIL } from "@/app/api/admin/activities/[id]/detail/route";
import { prisma } from "@/lib/prisma";
import { resetDb, get, patch, createAdmin, signInAsAdmin, withId } from "./helpers";

async function aTournament() {
  const activity = await prisma.activity.create({
    data: {
      title: "بطولة القرية",
      description: "بطولة كرة القدم السنوية",
      isTournament: true,
      format: "KNOCKOUT",
      matchShape: "FOOTBALL",
      minTeamSize: 5,
      maxTeamSize: 7,
    },
  });
  const home = await prisma.team.create({ data: { activityId: activity.id, name: "أ" } });
  const away = await prisma.team.create({ data: { activityId: activity.id, name: "ب" } });
  return { activity, home, away };
}

async function aFixture(activityId: string, homeTeamId: string, awayTeamId: string) {
  return prisma.match.create({ data: { activityId, homeTeamId, awayTeamId } });
}

function save(id: string, body: Record<string, unknown>) {
  return UPDATE_ACTIVITY(patch(`/api/admin/activities/${id}`, body), withId(id));
}

describe("the squad range locks when the tournament begins", () => {
  beforeEach(async () => {
    await resetDb();
    await signInAsAdmin(await createAdmin());
  });

  it("takes a new squad range while the fixtures are drawn and nothing is played", async () => {
    const { activity, home, away } = await aTournament();
    await aFixture(activity.id, home.id, away.id);

    const res = await save(activity.id, { minTeamSize: 6, maxTeamSize: 8 });

    expect(res.status).toBe(200);
    const row = await prisma.activity.findUniqueOrThrow({ where: { id: activity.id } });
    expect(row.minTeamSize).toBe(6);
    expect(row.maxTeamSize).toBe(8);
  });

  it("refuses a new squad range once a match has been played", async () => {
    const { activity, home, away } = await aTournament();
    const match = await aFixture(activity.id, home.id, away.id);
    await prisma.match.update({
      where: { id: match.id },
      data: { status: "PLAYED", homeScore: 2, awayScore: 1 },
    });

    const res = await save(activity.id, { minTeamSize: 6, maxTeamSize: 8 });

    expect(res.status).toBe(409);
    const row = await prisma.activity.findUniqueOrThrow({ where: { id: activity.id } });
    expect(row.minTeamSize).toBe(5);
    expect(row.maxTeamSize).toBe(7);
  });

  it("refuses a new squad range once a match has been forfeited", async () => {
    const { activity, home, away } = await aTournament();
    const match = await aFixture(activity.id, home.id, away.id);
    await prisma.match.update({
      where: { id: match.id },
      data: { forfeitWinnerTeamId: home.id, homeScore: 3, awayScore: 0 },
    });

    const res = await save(activity.id, { minTeamSize: 6, maxTeamSize: 8 });

    expect(res.status).toBe(409);
  });

  it("accepts the squad range it already has on a tournament that has begun", async () => {
    const { activity, home, away } = await aTournament();
    const match = await aFixture(activity.id, home.id, away.id);
    await prisma.match.update({ where: { id: match.id }, data: { status: "PLAYED" } });

    const res = await save(activity.id, { minTeamSize: 5, maxTeamSize: 7 });

    expect(res.status).toBe(200);
  });

  it("saves the home village toggle on a tournament that has begun", async () => {
    const { activity, home, away } = await aTournament();
    const match = await aFixture(activity.id, home.id, away.id);
    await prisma.match.update({ where: { id: match.id }, data: { status: "PLAYED" } });

    const res = await save(activity.id, {
      format: "KNOCKOUT",
      matchShape: "FOOTBALL",
      minTeamSize: 5,
      maxTeamSize: 7,
      organisedByHomeVillage: true,
      outsidePlayerLimit: 3,
    });

    expect(res.status).toBe(200);
    const row = await prisma.activity.findUniqueOrThrow({ where: { id: activity.id } });
    expect(row.organisedByHomeVillage).toBe(true);
    expect(row.outsidePlayerLimit).toBe(3);
  });

  it("keeps the format and the match shape locked as soon as a fixture exists", async () => {
    const { activity, home, away } = await aTournament();
    await aFixture(activity.id, home.id, away.id);

    expect((await save(activity.id, { format: "GROUPS_THEN_KNOCKOUT" })).status).toBe(409);
    expect((await save(activity.id, { matchShape: "SERIES" })).status).toBe(409);
  });
});

describe("what the settings dialog is told about the fixtures", () => {
  beforeEach(async () => {
    await resetDb();
    await signInAsAdmin(await createAdmin());
  });

  it("counts the fixtures and the played matches apart", async () => {
    const { activity, home, away } = await aTournament();
    const first = await aFixture(activity.id, home.id, away.id);
    await aFixture(activity.id, home.id, away.id);
    await prisma.match.update({ where: { id: first.id }, data: { status: "PLAYED" } });

    const body = await (
      await ACTIVITY_DETAIL(get(`/api/admin/activities/${activity.id}/detail`), withId(activity.id))
    ).json();

    expect(body.activity._count.matches).toBe(2);
    expect(body.activity._count.playedMatches).toBe(1);
  });
});
