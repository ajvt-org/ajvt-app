import { describe, it, expect, beforeEach } from "vitest";
import { PATCH as SAVE } from "@/app/api/admin/matches/[matchId]/route";
import { prisma } from "@/lib/prisma";
import { resetDb, patch, createAdmin, signInAsAdmin, makeMember } from "./helpers";

function withMatch(matchId: string) {
  return { params: Promise.resolve({ matchId }) };
}

async function football(isKnockout = true) {
  const activity = await prisma.activity.create({
    data: { title: "بطولة الوقت الإضافي", description: "بطولة", isTournament: true },
  });
  const home = await prisma.team.create({ data: { activityId: activity.id, name: "أ" } });
  const away = await prisma.team.create({ data: { activityId: activity.id, name: "ب" } });
  const players: { id: string }[] = [];
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
    data: { activityId: activity.id, homeTeamId: home.id, awayTeamId: away.id, isKnockout },
  });
  return { activity, home, away, players, match };
}

const save = (matchId: string, body: object) =>
  SAVE(patch(`/api/admin/matches/${matchId}`, body), withMatch(matchId));

const goal = (teamId: string, period: "REGULAR" | "EXTRA_TIME" = "REGULAR") => ({
  teamId,
  userId: null,
  period,
});

const kick = (teamId: string, scored = true) => ({ teamId, userId: null, scored });

describe("extra time", () => {
  beforeEach(async () => {
    await resetDb();
    await signInAsAdmin(await createAdmin());
  });

  it("is taken on a knockout level after ninety minutes", async () => {
    const { home, away, match } = await football(true);

    const res = await save(match.id, {
      goalEvents: [goal(home.id), goal(away.id), goal(home.id, "EXTRA_TIME")],
    });

    expect(res.status).toBe(200);
    const saved = await prisma.match.findUniqueOrThrow({ where: { id: match.id } });
    expect(saved).toMatchObject({ homeScore: 2, awayScore: 1 });
  });

  it("is refused on a group-stage match", async () => {
    const { home, match } = await football(false);

    const res = await save(match.id, { goalEvents: [goal(home.id, "EXTRA_TIME")] });

    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain("خروج المغلوب");
  });

  it("is refused when the ninety minutes were not level", async () => {
    const { home, match } = await football(true);

    const res = await save(match.id, {
      goalEvents: [goal(home.id), goal(home.id, "EXTRA_TIME")],
    });

    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain("الوقت الأصلي");
  });

  it("is refused when the same request clears the knockout flag", async () => {
    const { home, away, match } = await football(true);

    const res = await save(match.id, {
      isKnockout: false,
      goalEvents: [goal(home.id), goal(away.id), goal(home.id, "EXTRA_TIME")],
    });

    expect(res.status).toBe(400);
  });

  it("is allowed when the same request sets the knockout flag", async () => {
    const { home, away, match } = await football(false);

    const res = await save(match.id, {
      isKnockout: true,
      goalEvents: [goal(home.id), goal(away.id), goal(home.id, "EXTRA_TIME")],
    });

    expect(res.status).toBe(200);
  });
});

describe("the shootout", () => {
  beforeEach(async () => {
    await resetDb();
    await signInAsAdmin(await createAdmin());
  });

  it("is taken when the match is level after extra time", async () => {
    const { home, away, match } = await football(true);

    const res = await save(match.id, {
      goalEvents: [goal(home.id), goal(away.id)],
      penaltyKicks: [kick(home.id), kick(away.id, false)],
    });

    expect(res.status).toBe(200);
    const saved = await prisma.match.findUniqueOrThrow({ where: { id: match.id } });
    expect(saved).toMatchObject({ homePenalties: 1, awayPenalties: 0 });
  });

  it("is refused when extra time already decided the match", async () => {
    const { home, away, match } = await football(true);

    const res = await save(match.id, {
      goalEvents: [goal(home.id), goal(away.id), goal(home.id, "EXTRA_TIME")],
      penaltyKicks: [kick(home.id), kick(away.id, false)],
    });

    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain("تعادل");
  });

  it("is refused when two kicks in a row come from one side", async () => {
    const { home, away, match } = await football(true);

    const res = await save(match.id, {
      goalEvents: [goal(home.id), goal(away.id)],
      penaltyKicks: [kick(home.id), kick(home.id, false), kick(away.id, false)],
    });

    expect(res.status).toBe(400);
    expect((await res.json()).error).toContain("تتناوب");
  });

  it("survives a forfeit awarded after the match was played", async () => {
    const { home, away, match } = await football(true);
    await save(match.id, {
      goalEvents: [goal(home.id), goal(away.id)],
      penaltyKicks: [kick(home.id), kick(away.id, false)],
    });

    const res = await save(match.id, { forfeitWinnerTeamId: away.id });

    expect(res.status).toBe(200);
    const saved = await prisma.match.findUniqueOrThrow({ where: { id: match.id } });
    expect(saved).toMatchObject({ homeScore: 0, awayScore: 3, forfeitWinnerTeamId: away.id });
    expect(saved.homePenalties).toBe(1);
    expect(await prisma.matchPenaltyKick.count({ where: { matchId: match.id } })).toBe(2);
  });

  it("is kept when a forfeited match is saved again with its detail", async () => {
    const { home, away, match } = await football(true);

    const res = await save(match.id, {
      forfeitWinnerTeamId: away.id,
      goalEvents: [
        goal(home.id),
        goal(away.id),
        goal(home.id, "EXTRA_TIME"),
        goal(away.id, "EXTRA_TIME"),
      ],
      penaltyKicks: [kick(home.id), kick(away.id, false)],
    });

    expect(res.status).toBe(200);
    const saved = await prisma.match.findUniqueOrThrow({ where: { id: match.id } });
    expect(saved).toMatchObject({ homeScore: 0, awayScore: 3 });
    expect(await prisma.matchGoal.count({ where: { matchId: match.id } })).toBe(4);
    expect(await prisma.matchPenaltyKick.count({ where: { matchId: match.id } })).toBe(2);
  });
});
