import { describe, it, expect, beforeEach } from "vitest";
import { PATCH as SAVE } from "@/app/api/admin/matches/[matchId]/route";
import { PATCH as EDIT_BOOKING } from "@/app/api/admin/bookings/[bookingId]/route";
import { POST as ADD_BOOKING } from "@/app/api/admin/matches/[matchId]/bookings/route";
import { prisma } from "@/lib/prisma";
import {
  resetDb,
  patch,
  post,
  createAdmin,
  signInAsAdmin,
  makeMember,
  withParams,
} from "./helpers";

const withMatch = (matchId: string) => withParams({ matchId });

async function football() {
  const activity = await prisma.activity.create({
    data: { title: "بطولة", description: "بطولة", isTournament: true, format: "KNOCKOUT" },
  });
  const home = await prisma.team.create({ data: { activityId: activity.id, name: "أ" } });
  const away = await prisma.team.create({ data: { activityId: activity.id, name: "ب" } });
  const players: { id: string; userId: string }[] = [];
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

const save = (matchId: string, body: object) =>
  SAVE(patch(`/api/admin/matches/${matchId}`, body), withMatch(matchId));

const stored = (matchId: string) => prisma.match.findUniqueOrThrow({ where: { id: matchId } });

describe("a match won by forfeit", () => {
  beforeEach(async () => {
    await resetDb();
    await signInAsAdmin(await createAdmin());
  });

  it("awards three to a winner who scored nothing", async () => {
    const { home, away, players, match } = await football();

    await save(match.id, {
      goalEvents: [{ teamId: away.id, memberId: players[1].userId, minute: 10 }],
      forfeitWinnerTeamId: home.id,
    });

    expect(await stored(match.id)).toMatchObject({ homeScore: 3, awayScore: 0, status: "PLAYED" });
  });

  it("leaves a winner who already scored more than three at their own score", async () => {
    const { home, away, players, match } = await football();

    await save(match.id, {
      goalEvents: Array.from({ length: 5 }, (_, i) => ({
        teamId: home.id,
        memberId: players[0].userId,
        minute: i + 1,
      })),
      forfeitWinnerTeamId: home.id,
    });

    expect(await stored(match.id)).toMatchObject({ homeScore: 5, awayScore: 0 });
    expect(await prisma.matchGoal.count({ where: { teamId: away.id } })).toBe(0);
  });

  it("keeps the loser's goals on the record, so the decision can be reversed", async () => {
    const { home, away, players, match } = await football();

    await save(match.id, {
      goalEvents: [
        { teamId: away.id, memberId: players[1].userId, minute: 10 },
        { teamId: away.id, memberId: players[1].userId, minute: 20 },
      ],
      forfeitWinnerTeamId: home.id,
    });

    expect(await prisma.matchGoal.count({ where: { matchId: match.id, teamId: away.id } })).toBe(2);
    expect(await stored(match.id)).toMatchObject({ awayScore: 0 });
  });

  it("puts the real score back when the forfeit is lifted", async () => {
    const { home, away, players, match } = await football();
    await save(match.id, {
      goalEvents: [
        { teamId: away.id, memberId: players[1].userId, minute: 10 },
        { teamId: away.id, memberId: players[1].userId, minute: 20 },
        { teamId: home.id, memberId: players[0].userId, minute: 30 },
      ],
      forfeitWinnerTeamId: home.id,
    });
    expect(await stored(match.id)).toMatchObject({ homeScore: 3, awayScore: 0 });

    await save(match.id, { forfeitWinnerTeamId: null });

    expect(await stored(match.id)).toMatchObject({
      homeScore: 1,
      awayScore: 2,
      forfeitWinnerTeamId: null,
    });
  });

  it("recomputes the score when a forfeit is set on its own", async () => {
    const { away, players, match } = await football();
    await save(match.id, {
      goalEvents: [{ teamId: away.id, memberId: players[1].userId, minute: 10 }],
    });
    expect(await stored(match.id)).toMatchObject({ homeScore: 0, awayScore: 1 });

    await save(match.id, { forfeitWinnerTeamId: away.id });

    expect(await stored(match.id)).toMatchObject({ homeScore: 0, awayScore: 3 });
  });

  it("does not annul the cards", async () => {
    const { home, away, players, match } = await football();
    await ADD_BOOKING(
      post(`/api/admin/matches/${match.id}/bookings`, {
        userId: players[1].userId,
        teamId: away.id,
        cardType: "RED",
        minute: 50,
      }),
      withMatch(match.id),
    );

    await save(match.id, { goalEvents: [], forfeitWinnerTeamId: home.id });

    expect(await prisma.matchBooking.count({ where: { matchId: match.id } })).toBe(1);
  });

  it("refuses a winner that is not one of the two teams", async () => {
    const { match } = await football();
    const other = await prisma.team.create({
      data: { activityId: (await stored(match.id)).activityId, name: "ج" },
    });

    const res = await save(match.id, { goalEvents: [], forfeitWinnerTeamId: other.id });

    expect(res.status).toBe(400);
    expect(await stored(match.id)).toMatchObject({ forfeitWinnerTeamId: null });
  });

  it("writes an audit entry naming the side it was awarded to", async () => {
    const { home, match } = await football();

    await save(match.id, { goalEvents: [], forfeitWinnerTeamId: home.id });

    const entry = await prisma.auditLog.findFirstOrThrow({
      where: { action: "SET_MATCH_FORFEIT" },
    });
    expect(entry.targetLabel).toContain("أ");
  });
});

describe("correcting a card after the fact", () => {
  beforeEach(async () => {
    await resetDb();
    await signInAsAdmin(await createAdmin());
  });

  async function bookedMatch() {
    const built = await football();
    const res = await ADD_BOOKING(
      post(`/api/admin/matches/${built.match.id}/bookings`, {
        userId: built.players[0].userId,
        teamId: built.home.id,
        cardType: "YELLOW",
        minute: 20,
      }),
      withMatch(built.match.id),
    );
    const { booking } = await res.json();
    return { ...built, booking };
  }

  const edit = (bookingId: string, body: object) =>
    EDIT_BOOKING(patch(`/api/admin/bookings/${bookingId}`, body), withParams({ bookingId }));

  it("changes the minute without touching anything else", async () => {
    const { booking } = await bookedMatch();

    const res = await edit(booking.id, { minute: 35 });

    expect(res.status).toBe(200);
    const saved = await prisma.matchBooking.findUniqueOrThrow({ where: { id: booking.id } });
    expect(saved).toMatchObject({ minute: 35, cardType: "YELLOW" });
  });

  it("changes the colour of the card", async () => {
    const { booking } = await bookedMatch();

    await edit(booking.id, { cardType: "RED" });

    const saved = await prisma.matchBooking.findUniqueOrThrow({ where: { id: booking.id } });
    expect(saved).toMatchObject({ cardType: "RED", minute: 20 });
  });

  it("clears the minute when it is sent empty", async () => {
    const { booking } = await bookedMatch();

    await edit(booking.id, { minute: null });

    const saved = await prisma.matchBooking.findUniqueOrThrow({ where: { id: booking.id } });
    expect(saved.minute).toBeNull();
  });

  it("refuses a player named as memberId", async () => {
    const { booking, away, players } = await bookedMatch();
    const before = await prisma.matchBooking.findUniqueOrThrow({ where: { id: booking.id } });

    const res = await edit(booking.id, { memberId: players[1].userId, teamId: away.id });

    expect(res.status).toBe(400);
    const saved = await prisma.matchBooking.findUniqueOrThrow({ where: { id: booking.id } });
    expect(saved).toMatchObject({ userId: before.userId, teamId: before.teamId });
  });

  it("refuses a player who is not in the team the card is against", async () => {
    const { booking, players } = await bookedMatch();

    const res = await edit(booking.id, { userId: players[1].userId });

    expect(res.status).toBe(400);
  });

  it("moves the card to the other side when both are given together", async () => {
    const { booking, away, players } = await bookedMatch();

    const res = await edit(booking.id, { userId: players[1].userId, teamId: away.id });

    expect(res.status).toBe(200);
    const saved = await prisma.matchBooking.findUniqueOrThrow({ where: { id: booking.id } });
    expect(saved).toMatchObject({ teamId: away.id, userId: players[1].userId });
  });

  it("refuses a minute outside a match", async () => {
    const { booking } = await bookedMatch();

    expect((await edit(booking.id, { minute: 0 })).status).toBe(400);
    expect((await edit(booking.id, { minute: 131 })).status).toBe(400);
  });

  it("answers 404 for a card that is gone", async () => {
    await bookedMatch();

    expect((await edit("nope", {})).status).toBe(404);
  });

  it("records the change in the audit log", async () => {
    const { booking } = await bookedMatch();

    await edit(booking.id, { minute: 35 });

    const entry = await prisma.auditLog.findFirstOrThrow({ where: { action: "UPDATE_BOOKING" } });
    expect(entry.targetId).toBe(booking.id);
  });
});
