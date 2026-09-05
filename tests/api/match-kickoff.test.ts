import { describe, it, expect, beforeEach } from "vitest";
import { PATCH as SAVE } from "@/app/api/admin/matches/[matchId]/route";
import { prisma } from "@/lib/prisma";
import { resetDb, patch, createAdmin, signInAsAdmin, makeMember, withParams } from "./helpers";

const withMatch = (matchId: string) => withParams({ matchId });

const DAY = 24 * 60 * 60 * 1000;

async function fixture(matchDate: Date | null) {
  const activity = await prisma.activity.create({
    data: { title: "بطولة", description: "بطولة", isTournament: true, format: "KNOCKOUT" },
  });
  const home = await prisma.team.create({ data: { activityId: activity.id, name: "أ" } });
  const away = await prisma.team.create({ data: { activityId: activity.id, name: "ب" } });
  const players: string[] = [];
  for (let i = 0; i < 2; i++) {
    const member = await makeMember({
      fullName: `لاعب ${i}`,
      age: "البدريين",
      paymentMethod: "بنكيلي",
      status: "ACTIVE",
    });
    await prisma.teamMember.create({
      data: { teamId: i === 0 ? home.id : away.id, userId: member.userId, status: "ACTIVE" },
    });
    players.push(member.userId);
  }
  const match = await prisma.match.create({
    data: { activityId: activity.id, homeTeamId: home.id, awayTeamId: away.id, matchDate },
  });
  return { activity, home, away, players, match };
}

const save = (matchId: string, body: object) =>
  SAVE(patch(`/api/admin/matches/${matchId}`, body), withMatch(matchId));

const stored = (matchId: string) => prisma.match.findUniqueOrThrow({ where: { id: matchId } });

describe("a result on a fixture that has not been played", () => {
  beforeEach(async () => {
    await resetDb();
    await signInAsAdmin(await createAdmin());
  });

  it("refuses a score before the kickoff", async () => {
    const { match } = await fixture(new Date(Date.now() + DAY));

    const res = await save(match.id, { homeScore: 2, awayScore: 1 });

    expect(res.status).toBe(400);
    expect(await stored(match.id)).toMatchObject({ status: "SCHEDULED", homeScore: null });
  });

  it("refuses goal events before the kickoff", async () => {
    const { home, players, match } = await fixture(new Date(Date.now() + DAY));

    const res = await save(match.id, {
      goalEvents: [{ teamId: home.id, userId: players[0], minute: 10 }],
    });

    expect(res.status).toBe(400);
    expect(await stored(match.id)).toMatchObject({ status: "SCHEDULED" });
  });

  it("refuses a score when the kickoff is moved forward in the same save", async () => {
    const { match } = await fixture(new Date(Date.now() - DAY));

    const res = await save(match.id, {
      matchDate: new Date(Date.now() + DAY).toISOString(),
      homeScore: 1,
      awayScore: 0,
    });

    expect(res.status).toBe(400);
  });

  it("takes a score once the kickoff has passed", async () => {
    const { match } = await fixture(new Date(Date.now() - DAY));

    const res = await save(match.id, { homeScore: 2, awayScore: 1 });

    expect(res.status).toBe(200);
    expect(await stored(match.id)).toMatchObject({ homeScore: 2, awayScore: 1, status: "PLAYED" });
  });

  it("takes a score on a fixture with no date", async () => {
    const { match } = await fixture(null);

    const res = await save(match.id, { homeScore: 0, awayScore: 0 });

    expect(res.status).toBe(200);
    expect(await stored(match.id)).toMatchObject({ status: "PLAYED" });
  });

  it("keeps an entered result editable even with the kickoff ahead", async () => {
    const { match } = await fixture(new Date(Date.now() - DAY));
    await save(match.id, { homeScore: 2, awayScore: 1 });
    await prisma.match.update({
      where: { id: match.id },
      data: { matchDate: new Date(Date.now() + DAY) },
    });

    const res = await save(match.id, { homeScore: 3, awayScore: 1 });

    expect(res.status).toBe(200);
    expect(await stored(match.id)).toMatchObject({ homeScore: 3, awayScore: 1 });
  });
});
