import { describe, it, expect, beforeEach, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  resetDb,
  patch,
  post,
  createAdmin,
  createUser,
  signInAs,
  signInAsAdmin,
  makeMember,
  withParams,
} from "./helpers";

vi.mock("@/lib/push", () => ({ sendPushToUser: vi.fn(async () => {}) }));

const { PATCH: SAVE } = await import("@/app/api/admin/matches/[matchId]/route");
const { POST: OPEN_VOTE } = await import("@/app/api/admin/matches/[matchId]/mvp-vote/route");
const { GET: MY_MATCHES } = await import("@/app/api/user/matches/route");

const withMatch = (matchId: string) => withParams({ matchId });

const save = (matchId: string, body: object) =>
  SAVE(patch(`/api/admin/matches/${matchId}`, body), withMatch(matchId));

const openVote = (matchId: string, body: object) =>
  OPEN_VOTE(post(`/api/admin/matches/${matchId}/mvp-vote`, body), withMatch(matchId));

const stored = (matchId: string) => prisma.match.findUniqueOrThrow({ where: { id: matchId } });

async function tournamentWithPlaceholder() {
  const activity = await prisma.activity.create({
    data: {
      title: "بطولة",
      description: "بطولة",
      isTournament: true,
      format: "GROUPS_THEN_KNOCKOUT",
    },
  });
  const home = await prisma.team.create({ data: { activityId: activity.id, name: "أ" } });
  const away = await prisma.team.create({ data: { activityId: activity.id, name: "ب" } });
  const placeholder = await prisma.match.create({
    data: { activityId: activity.id, isKnockout: true, bracketRound: 1, round: "النهائي" },
  });
  return { activity, home, away, placeholder };
}

describe("a fixture whose teams are not known yet", () => {
  beforeEach(async () => {
    await resetDb();
    await signInAsAdmin(await createAdmin());
  });

  it("is stored with no teams at all", async () => {
    const { placeholder } = await tournamentWithPlaceholder();

    expect(await stored(placeholder.id)).toMatchObject({ homeTeamId: null, awayTeamId: null });
  });

  it("takes a day, a kick off and a venue", async () => {
    const { placeholder } = await tournamentWithPlaceholder();

    const res = await save(placeholder.id, {
      matchDate: "2026-09-20T16:00",
      venue: "الملعب البلدي",
    });

    expect(res.status).toBe(200);
    expect(await stored(placeholder.id)).toMatchObject({ venue: "الملعب البلدي" });
  });

  it("refuses a result", async () => {
    const { placeholder } = await tournamentWithPlaceholder();

    const res = await save(placeholder.id, { homeScore: 2, awayScore: 1 });

    expect(res.status).toBe(400);
    expect(await stored(placeholder.id)).toMatchObject({ homeScore: null, status: "SCHEDULED" });
  });

  it("refuses goals, cards and penalties", async () => {
    const { placeholder, home } = await tournamentWithPlaceholder();

    for (const body of [
      { goalEvents: [{ teamId: home.id, userId: null, minute: 10 }] },
      { penaltyKicks: [] },
      { homePenalties: 4, awayPenalties: 3 },
    ]) {
      expect((await save(placeholder.id, body)).status, JSON.stringify(body)).toBe(400);
    }
  });

  it("refuses a forfeit", async () => {
    const { placeholder, home } = await tournamentWithPlaceholder();

    const res = await save(placeholder.id, { forfeitWinnerTeamId: home.id });

    expect(res.status).toBe(400);
    expect(await stored(placeholder.id)).toMatchObject({ forfeitWinnerTeamId: null });
  });

  it("refuses a man of the match", async () => {
    const { placeholder } = await tournamentWithPlaceholder();
    const player = await makeMember({
      fullName: "لاعب",
      age: "البدريين",
      paymentMethod: "بنكيلي",
      status: "ACTIVE",
    });

    const res = await save(placeholder.id, { manOfTheMatchId: player.userId });

    expect(res.status).toBe(400);
  });

  it("refuses to open a vote on it", async () => {
    const { placeholder } = await tournamentWithPlaceholder();

    const res = await openVote(placeholder.id, { candidateMemberIds: [] });

    expect(res.status).toBe(400);
  });

  it("takes both teams at once and becomes a match", async () => {
    const { placeholder, home, away } = await tournamentWithPlaceholder();

    const res = await save(placeholder.id, { homeTeamId: home.id, awayTeamId: away.id });

    expect(res.status).toBe(200);
    expect(await stored(placeholder.id)).toMatchObject({
      homeTeamId: home.id,
      awayTeamId: away.id,
    });
  });

  it("refuses one team on its own", async () => {
    const { placeholder, home } = await tournamentWithPlaceholder();

    const res = await save(placeholder.id, { homeTeamId: home.id });

    expect(res.status).toBe(400);
    expect(await stored(placeholder.id)).toMatchObject({ homeTeamId: null });
  });

  it("accepts a result once the teams are set", async () => {
    const { placeholder, home, away } = await tournamentWithPlaceholder();
    await save(placeholder.id, { homeTeamId: home.id, awayTeamId: away.id });

    const res = await save(placeholder.id, { homeScore: 2, awayScore: 1 });

    expect(res.status).toBe(200);
    expect(await stored(placeholder.id)).toMatchObject({ homeScore: 2, status: "PLAYED" });
  });
});

describe("a member's fixtures", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("leave out a bracket fixture nobody has reached yet", async () => {
    const user = await createUser("22000090");
    const member = await makeMember({
      fullName: "عضو",
      age: "البدريين",
      paymentMethod: "بنكيلي",
      status: "ACTIVE",
      userId: user.id,
    });
    await signInAs(user);

    const activity = await prisma.activity.create({
      data: { title: "بطولة", description: "بطولة", isTournament: true, format: "KNOCKOUT" },
    });
    const mine = await prisma.team.create({ data: { activityId: activity.id, name: "فريقي" } });
    const rival = await prisma.team.create({ data: { activityId: activity.id, name: "الخصم" } });
    await prisma.teamMember.create({
      data: { teamId: mine.id, userId: member.userId, status: "ACTIVE" },
    });
    await prisma.match.create({
      data: {
        activityId: activity.id,
        homeTeamId: mine.id,
        awayTeamId: rival.id,
        matchDate: new Date("2026-09-20T16:00:00.000Z"),
      },
    });
    await prisma.match.create({
      data: {
        activityId: activity.id,
        isKnockout: true,
        bracketRound: 2,
        matchDate: new Date("2026-09-27T16:00:00.000Z"),
      },
    });

    const body = (await (await MY_MATCHES()).json()) as { upcoming: { id: string }[] };

    expect(body.upcoming).toHaveLength(1);
  });
});
