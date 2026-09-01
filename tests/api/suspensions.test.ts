import { describe, it, expect, beforeEach } from "vitest";
import { GET as LIST, POST as PROPOSE } from "@/app/api/admin/activities/[id]/suspensions/route";
import {
  PATCH as DECIDE,
  DELETE as LIFT,
} from "@/app/api/admin/activities/[id]/suspensions/[suspensionId]/route";
import { POST as BOOK } from "@/app/api/admin/matches/[matchId]/bookings/route";
import { PATCH as SAVE_RESULT } from "@/app/api/admin/matches/[matchId]/route";
import { prisma } from "@/lib/prisma";
import {
  resetDb,
  get,
  post,
  patch,
  del,
  createAdmin,
  signInAsAdmin,
  withId,
  makeMember,
} from "./helpers";

function withIds(id: string, suspensionId: string) {
  return { params: Promise.resolve({ id, suspensionId }) };
}

function withMatch(matchId: string) {
  return { params: Promise.resolve({ matchId }) };
}

async function tournament() {
  const activity = await prisma.activity.create({
    data: { title: "بطولة الانضباط", description: "بطولة", isTournament: true, format: "KNOCKOUT" },
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
        userId: member.userId,
        status: "ACTIVE",
      },
    });
    players.push(member);
  }
  const match = await prisma.match.create({
    data: { activityId: activity.id, homeTeamId: home.id, awayTeamId: away.id },
  });
  return { activity, home, away, players, match };
}

async function activate(activityId: string, suspensionId: string) {
  return DECIDE(
    patch(`/api/admin/activities/${activityId}/suspensions/${suspensionId}`, { approve: true }),
    withIds(activityId, suspensionId),
  );
}

describe("the discipline engine", () => {
  beforeEach(async () => {
    await resetDb();
    await signInAsAdmin(await createAdmin());
  });

  it("refuses a card that names the player as memberId", async () => {
    const { away, players, match } = await tournament();

    const res = await BOOK(
      post(`/api/admin/matches/${match.id}/bookings`, {
        memberId: players[1].userId,
        teamId: away.id,
        cardType: "RED",
      }),
      withMatch(match.id),
    );

    expect(res.status).toBe(400);
    expect(await prisma.matchBooking.count()).toBe(0);
  });

  it("proposes the tournament's ban when a red card lands, and only proposes", async () => {
    const { away, players, match } = await tournament();

    const res = await BOOK(
      post(`/api/admin/matches/${match.id}/bookings`, {
        userId: players[1].userId,
        teamId: away.id,
        cardType: "RED",
      }),
      withMatch(match.id),
    );

    expect((await res.json()).proposed).toBe(true);
    const suspension = await prisma.suspension.findFirstOrThrow();
    expect(suspension).toMatchObject({
      reason: "RED_CARD",
      scope: "MATCHES",
      matches: 1,
      status: "PROPOSED",
    });
  });

  it("proposes on the second yellow, not the first", async () => {
    const { activity, away, players, match } = await tournament();
    const second = await prisma.match.create({
      data: {
        activityId: activity.id,
        homeTeamId: (await prisma.team.findFirstOrThrow({ where: { name: "أ" } })).id,
        awayTeamId: away.id,
      },
    });

    const book = (matchId: string) =>
      BOOK(
        post(`/api/admin/matches/${matchId}/bookings`, {
          userId: players[1].userId,
          teamId: away.id,
          cardType: "YELLOW",
        }),
        withMatch(matchId),
      );

    expect((await (await book(match.id)).json()).proposed).toBe(false);
    expect((await (await book(second.id)).json()).proposed).toBe(true);
    expect(await prisma.suspension.count()).toBe(1);
    expect((await prisma.suspension.findFirstOrThrow()).reason).toBe("YELLOW_CARDS");
  });

  it("keeps a suspended player out of the score sheet", async () => {
    const { activity, players, match } = await tournament();
    const proposal = await (
      await PROPOSE(
        post(`/api/admin/activities/${activity.id}/suspensions`, {
          userId: players[0].userId,
          scope: "INDEFINITE",
        }),
        withId(activity.id),
      )
    ).json();
    await activate(activity.id, proposal.suspension.id);

    const res = await SAVE_RESULT(
      patch(`/api/admin/matches/${match.id}`, {
        homeScore: 1,
        awayScore: 0,
        homeGoals: [{ memberId: players[0].userId, count: 1 }],
      }),
      withMatch(match.id),
    );

    expect(res.status).toBe(409);
  });

  it("serves a match ban down as the team plays, lifting at zero", async () => {
    const { activity, players, match } = await tournament();
    const proposal = await (
      await PROPOSE(
        post(`/api/admin/activities/${activity.id}/suspensions`, {
          userId: players[0].userId,
          scope: "MATCHES",
          matches: 1,
        }),
        withId(activity.id),
      )
    ).json();
    await activate(activity.id, proposal.suspension.id);

    await SAVE_RESULT(
      patch(`/api/admin/matches/${match.id}`, { homeScore: 0, awayScore: 0 }),
      withMatch(match.id),
    );

    const served = await prisma.suspension.findFirstOrThrow();
    expect(served).toMatchObject({ matches: 0, status: "LIFTED" });
  });

  it("dismissing a proposal removes it entirely", async () => {
    const { activity, players } = await tournament();
    const proposal = await (
      await PROPOSE(
        post(`/api/admin/activities/${activity.id}/suspensions`, {
          userId: players[0].userId,
          scope: "INDEFINITE",
        }),
        withId(activity.id),
      )
    ).json();

    await DECIDE(
      patch(`/api/admin/activities/${activity.id}/suspensions/${proposal.suspension.id}`, {
        approve: false,
      }),
      withIds(activity.id, proposal.suspension.id),
    );

    expect(await prisma.suspension.count()).toBe(0);
  });

  it("lifts an active suspension by hand", async () => {
    const { activity, players } = await tournament();
    const proposal = await (
      await PROPOSE(
        post(`/api/admin/activities/${activity.id}/suspensions`, {
          userId: players[0].userId,
          scope: "INDEFINITE",
        }),
        withId(activity.id),
      )
    ).json();
    await activate(activity.id, proposal.suspension.id);

    const res = await LIFT(
      del(`/api/admin/activities/${activity.id}/suspensions/${proposal.suspension.id}`),
      withIds(activity.id, proposal.suspension.id),
    );

    expect(res.status).toBe(200);
    expect((await prisma.suspension.findFirstOrThrow()).status).toBe("LIFTED");
  });

  it("refuses a proposal that names the player as memberId", async () => {
    const { activity, players } = await tournament();

    const res = await PROPOSE(
      post(`/api/admin/activities/${activity.id}/suspensions`, {
        memberId: players[0].userId,
        scope: "INDEFINITE",
      }),
      withId(activity.id),
    );

    expect(res.status).toBe(400);
    expect(await prisma.suspension.count()).toBe(0);
  });

  it("refuses a second open suspension for the same player", async () => {
    const { activity, players } = await tournament();
    await PROPOSE(
      post(`/api/admin/activities/${activity.id}/suspensions`, {
        userId: players[0].userId,
        scope: "INDEFINITE",
      }),
      withId(activity.id),
    );

    const res = await PROPOSE(
      post(`/api/admin/activities/${activity.id}/suspensions`, {
        userId: players[0].userId,
        scope: "MATCHES",
        matches: 2,
      }),
      withId(activity.id),
    );

    expect(res.status).toBe(409);
  });

  it("lists proposals and bans with the tournament's rules", async () => {
    const { activity, players } = await tournament();
    await PROPOSE(
      post(`/api/admin/activities/${activity.id}/suspensions`, {
        userId: players[0].userId,
        scope: "DAYS",
        until: "2027-01-01T00:00:00.000Z",
      }),
      withId(activity.id),
    );

    const body = await (
      await LIST(get(`/api/admin/activities/${activity.id}/suspensions`), withId(activity.id))
    ).json();

    expect(body.rules).toEqual({ yellowsForBan: 2, redBanMatches: 1 });
    expect(body.suspensions).toHaveLength(1);
    expect(body.suspensions[0].member.fullName).toBe("لاعب 0");
  });
  it("serves a match ban once when a result is cleared and entered again", async () => {
    const { activity, players, match } = await tournament();
    const proposal = await (
      await PROPOSE(
        post(`/api/admin/activities/${activity.id}/suspensions`, {
          userId: players[0].userId,
          scope: "MATCHES",
          matches: 2,
        }),
        withId(activity.id),
      )
    ).json();
    await activate(activity.id, proposal.suspension.id);

    const result = (homeScore: number | null, awayScore: number | null) =>
      SAVE_RESULT(
        patch(`/api/admin/matches/${match.id}`, { homeScore, awayScore }),
        withMatch(match.id),
      );

    await result(0, 0);
    await result(null, null);
    await result(1, 0);

    const served = await prisma.suspension.findUniqueOrThrow({
      where: { id: proposal.suspension.id },
    });
    expect(served.matches).toBe(1);
    expect(served.status).toBe("ACTIVE");
  });

  it("counts yellows again from zero after a ban, not from the tournament's start", async () => {
    const { activity, away, players, match } = await tournament();
    await prisma.activity.update({ where: { id: activity.id }, data: { yellowsForBan: 2 } });

    const book = () =>
      BOOK(
        post(`/api/admin/matches/${match.id}/bookings`, {
          userId: players[1].userId,
          teamId: away.id,
          cardType: "YELLOW",
        }),
        withMatch(match.id),
      );
    const yellowBans = () => prisma.suspension.count({ where: { reason: "YELLOW_CARDS" } });

    await book();
    await book();
    const first = await prisma.suspension.findFirstOrThrow({ where: { reason: "YELLOW_CARDS" } });

    await book();
    await book();
    expect(await yellowBans()).toBe(1);

    await activate(activity.id, first.id);
    await LIFT(
      del(`/api/admin/activities/${activity.id}/suspensions/${first.id}`),
      withIds(activity.id, first.id),
    );

    await book();
    expect(await yellowBans()).toBe(2);
  });
});
