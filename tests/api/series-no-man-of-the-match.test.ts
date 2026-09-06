import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { sideIdData } from "@/lib/matchSides";
import {
  resetDb,
  post,
  patch,
  createAdmin,
  createUser,
  signInAs,
  signInAsAdmin,
  makeMember,
} from "./helpers";
import { tournament as messages } from "@/lib/messages";

import { POST as OPEN } from "@/app/api/admin/matches/[matchId]/mvp-vote/route";
import { POST as CAST } from "@/app/api/matches/[matchId]/mvp-vote/route";
import { PATCH as SAVE_RESULT } from "@/app/api/admin/matches/[matchId]/route";

const withMatch = (matchId: string) => ({ params: Promise.resolve({ matchId }) });

async function tournamentOfShape(matchShape: "FOOTBALL" | "SERIES") {
  const activity = await prisma.activity.create({
    data: {
      title: "بطولة",
      description: "بطولة",
      isTournament: true,
      matchShape,
    },
  });
  const home = await prisma.team.create({ data: { activityId: activity.id, name: "أ" } });
  const away = await prisma.team.create({ data: { activityId: activity.id, name: "ب" } });
  const players = [];
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
    players.push(member);
  }
  const match = await prisma.match.create({
    data: {
      activityId: activity.id,
      ...sideIdData(matchShape, home.id, away.id),
      matchDate: new Date(Date.now() - 60 * 60_000),
      status: "PLAYED",
      homeScore: 1,
      awayScore: 0,
    },
  });
  return { activity, match, players };
}

const openVote = (matchId: string, candidateMemberIds: string[]) =>
  OPEN(post(`/api/admin/matches/${matchId}/mvp-vote`, { candidateMemberIds }), withMatch(matchId));

const setManOfTheMatch = (matchId: string, manOfTheMatchId: string | null) =>
  SAVE_RESULT(patch(`/api/admin/matches/${matchId}`, { manOfTheMatchId }), withMatch(matchId));

describe("the man of the match outside football", () => {
  beforeEach(async () => {
    await resetDb();
    await signInAsAdmin(await createAdmin("boss", "SUPER"));
  });

  it("refuses to open a vote on a series match, with its own message", async () => {
    const { match, players } = await tournamentOfShape("SERIES");

    const res = await openVote(
      match.id,
      players.map((p) => p.userId),
    );

    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe(messages.motmFootballOnly);
    expect(await prisma.matchMvpVote.findUnique({ where: { matchId: match.id } })).toBeNull();
  });

  it("still opens a vote on a football match", async () => {
    const { match, players } = await tournamentOfShape("FOOTBALL");

    const res = await openVote(
      match.id,
      players.map((p) => p.userId),
    );

    expect(res.status).toBe(201);
  });

  it("refuses a man of the match on a series result", async () => {
    const { match, players } = await tournamentOfShape("SERIES");

    const res = await setManOfTheMatch(match.id, players[0].userId);

    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe(messages.motmFootballOnly);
    const stored = await prisma.match.findUniqueOrThrow({ where: { id: match.id } });
    expect(stored.manOfTheMatchUserId).toBeNull();
  });

  it("still takes a man of the match on a football result", async () => {
    const { match, players } = await tournamentOfShape("FOOTBALL");

    const res = await setManOfTheMatch(match.id, players[0].userId);

    expect(res.status).toBe(200);
    const stored = await prisma.match.findUniqueOrThrow({ where: { id: match.id } });
    expect(stored.manOfTheMatchUserId).toBe(players[0].userId);
  });

  it("lets a man of the match already stored be cleared whatever the shape", async () => {
    const { match, players } = await tournamentOfShape("SERIES");
    await prisma.match.update({
      where: { id: match.id },
      data: { manOfTheMatchUserId: players[0].userId },
    });

    const res = await setManOfTheMatch(match.id, null);

    expect(res.status).toBe(200);
    const stored = await prisma.match.findUniqueOrThrow({ where: { id: match.id } });
    expect(stored.manOfTheMatchUserId).toBeNull();
  });

  it("refuses a ballot on a vote whose tournament is a series", async () => {
    const { match, players } = await tournamentOfShape("FOOTBALL");
    await openVote(
      match.id,
      players.map((p) => p.userId),
    );
    const vote = await prisma.matchMvpVote.findUniqueOrThrow({
      where: { matchId: match.id },
      include: { candidates: true },
    });
    await prisma.activity.update({
      where: { id: match.activityId },
      data: { matchShape: "SERIES" },
    });

    await signInAs(await createUser("30000001"));
    const res = await CAST(
      post(`/api/matches/${match.id}/mvp-vote`, { candidateId: vote.candidates[0].id }),
      withMatch(match.id),
    );

    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe(messages.motmFootballOnly);
  });
});
