import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
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

import { POST as OPEN, PATCH as SET } from "@/app/api/admin/matches/[matchId]/mvp-vote/route";
import { POST as CAST } from "@/app/api/matches/[matchId]/mvp-vote/route";
import { GET as MATCHES } from "@/app/api/admin/activities/[id]/matches/route";
import { get } from "./helpers";

const withMatch = (matchId: string) => ({ params: Promise.resolve({ matchId }) });
const withActivity = (id: string) => ({ params: Promise.resolve({ id }) });

async function tournament(mvpVoteMinutes = 120) {
  const activity = await prisma.activity.create({
    data: { title: "بطولة", description: "بطولة", isTournament: true, mvpVoteMinutes },
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
      data: {
        teamId: i === 0 ? home.id : away.id,
        memberId: member.id,
        userId: member.userId,
        status: "ACTIVE",
      },
    });
    players.push(member);
  }
  const match = await prisma.match.create({
    data: {
      activityId: activity.id,
      homeTeamId: home.id,
      awayTeamId: away.id,
      status: "PLAYED",
      homeScore: 1,
      awayScore: 0,
    },
  });
  return { activity, match, players };
}

const openVote = (matchId: string, body: object) =>
  OPEN(post(`/api/admin/matches/${matchId}/mvp-vote`, body), withMatch(matchId));

describe("the man of the match voting window", () => {
  beforeEach(async () => {
    await resetDb();
    await signInAsAdmin(await createAdmin("boss", "SUPER"));
  });

  it("refuses to open on a match with no result yet", async () => {
    const { match, players } = await tournament();
    await prisma.match.update({ where: { id: match.id }, data: { status: "SCHEDULED" } });

    const res = await openVote(match.id, { candidateMemberIds: players.map((p) => p.id) });

    expect(res.status).toBe(400);
  });

  it("takes its window from the tournament when the admin names no minutes", async () => {
    const { match, players } = await tournament(45);

    const res = await openVote(match.id, { candidateMemberIds: players.map((p) => p.id) });

    expect(res.status).toBe(201);
    const vote = await prisma.matchMvpVote.findUniqueOrThrow({ where: { matchId: match.id } });
    const minutes = Math.round((vote.closesAt.getTime() - vote.createdAt.getTime()) / 60_000);
    expect(minutes).toBe(45);
  });

  it("takes the minutes given for this match over the tournament default", async () => {
    const { match, players } = await tournament(120);

    await openVote(match.id, { candidateMemberIds: players.map((p) => p.id), minutes: 10 });

    const vote = await prisma.matchMvpVote.findUniqueOrThrow({ where: { matchId: match.id } });
    const minutes = Math.round((vote.closesAt.getTime() - vote.createdAt.getTime()) / 60_000);
    expect(minutes).toBe(10);
  });

  it("refuses a window outside the allowed range", async () => {
    const { match, players } = await tournament();

    const res = await openVote(match.id, {
      candidateMemberIds: players.map((p) => p.id),
      minutes: 0,
    });

    expect(res.status).toBe(400);
  });

  it("takes a ballot while the window is open", async () => {
    const { match, players } = await tournament();
    await openVote(match.id, { candidateMemberIds: players.map((p) => p.id) });
    const vote = await prisma.matchMvpVote.findUniqueOrThrow({
      where: { matchId: match.id },
      include: { candidates: true },
    });

    await signInAs(await createUser("30000001"));
    const res = await CAST(
      post(`/api/matches/${match.id}/mvp-vote`, { candidateId: vote.candidates[0].id }),
      withMatch(match.id),
    );

    expect(res.status).toBe(200);
  });

  it("refuses a ballot once the window has passed, with no admin action", async () => {
    const { match, players } = await tournament();
    await openVote(match.id, { candidateMemberIds: players.map((p) => p.id) });
    const vote = await prisma.matchMvpVote.findUniqueOrThrow({
      where: { matchId: match.id },
      include: { candidates: true },
    });
    await prisma.matchMvpVote.update({
      where: { matchId: match.id },
      data: { closesAt: new Date(Date.now() - 60_000) },
    });

    await signInAs(await createUser("30000002"));
    const res = await CAST(
      post(`/api/matches/${match.id}/mvp-vote`, { candidateId: vote.candidates[0].id }),
      withMatch(match.id),
    );

    expect(res.status).toBe(409);
    const saved = await prisma.matchMvpVote.findUniqueOrThrow({ where: { matchId: match.id } });
    expect(saved.status).toBe("OPEN");
  });

  it("gives a reopened vote a fresh window, so it is not shut again at once", async () => {
    const { match, players } = await tournament(30);
    await openVote(match.id, { candidateMemberIds: players.map((p) => p.id) });
    await prisma.matchMvpVote.update({
      where: { matchId: match.id },
      data: { status: "CLOSED", closesAt: new Date(Date.now() - 60_000) },
    });

    const res = await SET(
      patch(`/api/admin/matches/${match.id}/mvp-vote`, { status: "OPEN" }),
      withMatch(match.id),
    );

    expect(res.status).toBe(200);
    const saved = await prisma.matchMvpVote.findUniqueOrThrow({ where: { matchId: match.id } });
    expect(saved.status).toBe("OPEN");
    expect(saved.closesAt.getTime()).toBeGreaterThan(Date.now());
  });

  it("extends a running vote without touching its status", async () => {
    const { match, players } = await tournament();
    await openVote(match.id, { candidateMemberIds: players.map((p) => p.id), minutes: 5 });
    const before = await prisma.matchMvpVote.findUniqueOrThrow({ where: { matchId: match.id } });

    await SET(
      patch(`/api/admin/matches/${match.id}/mvp-vote`, { minutes: 90 }),
      withMatch(match.id),
    );

    const after = await prisma.matchMvpVote.findUniqueOrThrow({ where: { matchId: match.id } });
    expect(after.closesAt.getTime()).toBeGreaterThan(before.closesAt.getTime());
    expect(after.status).toBe("OPEN");
  });

  it("refuses a change that names neither a status nor minutes", async () => {
    const { match, players } = await tournament();
    await openVote(match.id, { candidateMemberIds: players.map((p) => p.id) });

    const res = await SET(
      patch(`/api/admin/matches/${match.id}/mvp-vote`, {}),
      withMatch(match.id),
    );

    expect(res.status).toBe(400);
  });
});

describe("settling the winner once the window closes", () => {
  beforeEach(async () => {
    await resetDb();
    await signInAsAdmin(await createAdmin("boss", "SUPER"));
  });

  async function voteWith(tally: number[], minutes = 120) {
    const { activity, match, players } = await tournament(minutes);
    await openVote(match.id, { candidateMemberIds: players.map((p) => p.id) });
    const vote = await prisma.matchMvpVote.findUniqueOrThrow({
      where: { matchId: match.id },
      include: { candidates: { orderBy: { memberId: "asc" } } },
    });
    let phone = 31000000;
    for (const [index, votes] of tally.entries()) {
      for (let v = 0; v < votes; v++) {
        const user = await createUser(String(++phone));
        await prisma.mvpVote.create({
          data: { voteId: vote.id, candidateId: vote.candidates[index].id, userId: user.id },
        });
      }
    }
    return { activity, match, vote };
  }

  const readMatches = (activityId: string) =>
    MATCHES(get(`/api/admin/activities/${activityId}/matches`), withActivity(activityId));

  it("leaves the winner alone while the vote is still running", async () => {
    const { activity, match } = await voteWith([2, 1]);

    await readMatches(activity.id);

    const saved = await prisma.match.findUniqueOrThrow({ where: { id: match.id } });
    expect(saved.manOfTheMatchId).toBeNull();
  });

  it("applies the leader the first time anyone reads after the deadline", async () => {
    const { activity, match, vote } = await voteWith([2, 1]);
    await prisma.matchMvpVote.update({
      where: { id: vote.id },
      data: { closesAt: new Date(Date.now() - 1000) },
    });

    await readMatches(activity.id);

    const saved = await prisma.match.findUniqueOrThrow({ where: { id: match.id } });
    const winner = await prisma.mvpCandidate.findFirstOrThrow({
      where: { voteId: vote.id },
      orderBy: { memberId: "asc" },
    });
    expect(saved.manOfTheMatchId).toBe(winner.memberId);
  });

  it("applies nobody on a tie, leaving the manual pick to the admin", async () => {
    const { activity, match, vote } = await voteWith([2, 2]);
    await prisma.matchMvpVote.update({
      where: { id: vote.id },
      data: { closesAt: new Date(Date.now() - 1000) },
    });

    await readMatches(activity.id);

    const saved = await prisma.match.findUniqueOrThrow({ where: { id: match.id } });
    expect(saved.manOfTheMatchId).toBeNull();
  });

  it("never overwrites a pick the admin made by hand", async () => {
    const { activity, match, vote } = await voteWith([2, 1]);
    const chosen = await prisma.mvpCandidate.findFirstOrThrow({
      where: { voteId: vote.id },
      orderBy: { memberId: "desc" },
    });
    await prisma.match.update({
      where: { id: match.id },
      data: { manOfTheMatchId: chosen.memberId },
    });
    await prisma.matchMvpVote.update({
      where: { id: vote.id },
      data: { closesAt: new Date(Date.now() - 1000) },
    });

    await readMatches(activity.id);

    const saved = await prisma.match.findUniqueOrThrow({ where: { id: match.id } });
    expect(saved.manOfTheMatchId).toBe(chosen.memberId);
  });

  it("settles once and stays settled on a second read", async () => {
    const { activity, match, vote } = await voteWith([3, 1]);
    await prisma.matchMvpVote.update({
      where: { id: vote.id },
      data: { closesAt: new Date(Date.now() - 1000) },
    });

    await readMatches(activity.id);
    const first = await prisma.match.findUniqueOrThrow({ where: { id: match.id } });
    await readMatches(activity.id);
    const second = await prisma.match.findUniqueOrThrow({ where: { id: match.id } });

    expect(second.manOfTheMatchId).toBe(first.manOfTheMatchId);
    expect(second.manOfTheMatchId).not.toBeNull();
  });
});
