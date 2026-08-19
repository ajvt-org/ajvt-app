import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { resetDb, get, createUsers, createAdmin, signInAs, signInAsAdmin } from "./helpers";
import { DEFAULT_BANDS } from "@/lib/competitionConfig";

import { GET as STANDINGS } from "@/app/api/quiz/standings/route";
import { getStandings } from "@/lib/quizRankingServer";
import { GET as WINNERS } from "@/app/api/admin/quiz/competitions/[id]/winners/route";

const START = (() => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  d.setUTCHours(0, 0, 0, 0);
  return d;
})();

const PERIOD = 1440 * 60_000;
const roundIndex = (offset: number) => offset;
const atNoon = (index: number) => new Date(START.getTime() + index * PERIOD + 12 * 3_600_000);
const today = () => 1;
const winners = (id: string) =>
  WINNERS(get(`/api/admin/quiz/competitions/${id}/winners`), { params: Promise.resolve({ id }) });
const standings = () => STANDINGS(get("/api/quiz/standings"));

async function competition(over: Record<string, unknown> = {}) {
  return prisma.competition.create({
    data: {
      name: "مسابقة",
      startsAt: START,
      roundCount: 30,
      roundPeriodMinutes: 1440,
      roundWindowMinutes: 1440,
      servedCount: 2,
      poolSize: 3,
      groupSize: 7,
      countingRounds: 6,
      speedBands: DEFAULT_BANDS as unknown as object,
      startedAt: new Date(),
      ...over,
    },
  });
}

async function attempt(
  competitionId: string,
  userId: string,
  index: number,
  score: number,
  finishedAt: Date | null = new Date(),
) {
  const round =
    (await prisma.quizRound.findUnique({
      where: { competitionId_index: { competitionId, index } },
    })) ??
    (await prisma.quizRound.create({
      data: {
        competitionId,
        index,
        opensAt: new Date(START.getTime() + index * PERIOD),
        closesAt: new Date(START.getTime() + (index + 1) * PERIOD),
      },
    }));
  return prisma.quizAttempt.create({
    data: { roundId: round.id, userId, score, finishedAt },
  });
}

async function member(userId: string, fullName: string) {
  return prisma.member.create({
    data: {
      userId,
      fullName,
      age: "البدريين",
      paymentMethod: "بنكيلي",
      status: "ACTIVE",
      paidAmount: 100,
    },
  });
}

describe("standings a member can see", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("says nothing is running before a competition starts", async () => {
    await competition({ startedAt: null });
    const [u] = await createUsers(1);
    await signInAs(u);

    const body = await (await standings()).json();

    expect(body.running).toBe(false);
    expect(body.today).toEqual([]);
  });

  it("ranks the open round by score", async () => {
    const c = await competition();
    const [a, b] = await createUsers(2);
    await member(a.id, "أحمد");
    await member(b.id, "محمد");
    await attempt(c.id, a.id, today(), 30);
    await attempt(c.id, b.id, today(), 50);
    const body = await getStandings(c.id, a.id, 10, atNoon(today()));

    expect(body.running).toBe(true);
    expect(body.today.map((r) => r.name)).toEqual(["محمد", "أحمد"]);
    expect(body.today[0].rank).toBe(1);
  });

  it("tells the member their own place even outside the top", async () => {
    const c = await competition();
    const users = await createUsers(3);
    for (const [i, u] of users.entries()) {
      await member(u.id, `عضو ${i}`);
      await attempt(c.id, u.id, today(), (3 - i) * 10);
    }
    const body = await getStandings(c.id, users[2].id, 10, atNoon(today()));

    expect(body.mine?.today?.rank).toBe(3);
    expect(body.mine?.today?.total).toBe(10);
  });

  it("drops the worst round from the group once the allowance is passed", async () => {
    const c = await competition();
    const [u] = await createUsers(1);
    await member(u.id, "أحمد");
    for (let i = 0; i < 7; i++) await attempt(c.id, u.id, roundIndex(i), i === 0 ? 1 : 10);
    const body = await getStandings(c.id, u.id, 10, atNoon(roundIndex(1)));

    expect(body.thisWeek[0].total).toBe(60);
  });

  it("counts nothing for the rounds a member joined too late for", async () => {
    const c = await competition();
    const [early, late] = await createUsers(2);
    await member(early.id, "مبكر");
    await member(late.id, "متأخر");
    for (let i = 0; i < 3; i++) await attempt(c.id, early.id, roundIndex(i), 10);
    await attempt(c.id, late.id, roundIndex(2), 10);
    const body = await getStandings(c.id, late.id, 10, atNoon(roundIndex(2)));

    expect(body.overall[0].name).toBe("مبكر");
    expect(body.overall[0].total).toBe(30);
    expect(body.mine?.overall?.total).toBe(10);
  });

  it("skips a private competition the member was not invited to", async () => {
    await competition({ visibility: "PRIVATE" });
    const [u] = await createUsers(1);
    await member(u.id, "أحمد");
    await signInAs(u);

    const body = await (await standings()).json();

    expect(body.running).toBe(false);
    expect(body.competitionId).toBeNull();
  });

  it("shows a private competition to the member who was invited", async () => {
    const c = await competition({ visibility: "PRIVATE" });
    const [u] = await createUsers(1);
    await member(u.id, "أحمد");
    await prisma.quizParticipant.create({ data: { competitionId: c.id, userId: u.id } });
    await signInAs(u);

    const body = await (await standings()).json();

    expect(body.running).toBe(true);
    expect(body.competitionId).toBe(c.id);
  });

  it("falls back to a competition the member may play when asked for one they may not", async () => {
    const open = await competition();
    const shut = await competition({ visibility: "PRIVATE", name: "خاصة" });
    const [u] = await createUsers(1);
    await member(u.id, "أحمد");
    await signInAs(u);

    const body = await (await STANDINGS(get(`/api/quiz/standings?competition=${shut.id}`))).json();

    expect(body.competitionId).toBe(open.id);
  });

  it("shows a member with no attempt as having no place", async () => {
    await competition();
    const [u] = await createUsers(1);
    await member(u.id, "أحمد");
    await signInAs(u);

    const body = await (await standings()).json();

    expect(body.mine.today).toBeNull();
  });
});

describe("winners an admin can read", () => {
  beforeEach(async () => {
    await resetDb();
    await signInAsAdmin(await createAdmin("quizmaster", "QUIZ"));
  });

  it("names a winner for each round played", async () => {
    const c = await competition();
    const [a, b] = await createUsers(2);
    await member(a.id, "أحمد");
    await member(b.id, "محمد");
    await attempt(c.id, a.id, roundIndex(0), 50);
    await attempt(c.id, b.id, roundIndex(0), 30);
    await attempt(c.id, b.id, roundIndex(1), 40);

    const body = await (await winners(c.id)).json();

    expect(body.rounds).toHaveLength(2);
    expect(body.rounds[0].winner.name).toBe("أحمد");
    expect(body.rounds[1].winner.name).toBe("محمد");
  });

  it("names a group winner", async () => {
    const c = await competition();
    const [a] = await createUsers(1);
    await member(a.id, "أحمد");
    await attempt(c.id, a.id, roundIndex(0), 50);

    const body = await (await winners(c.id)).json();

    expect(body.groups[0].group).toBe(0);
    expect(body.groups[0].winner.name).toBe("أحمد");
  });

  it("holds back the overall winner while the run is still going", async () => {
    const c = await competition();
    const [a] = await createUsers(1);
    await member(a.id, "أحمد");
    await attempt(c.id, a.id, roundIndex(0), 50);

    expect((await (await winners(c.id)).json()).overall).toBeNull();
  });

  it("names the overall winner once the run is over", async () => {
    const past = new Date(START.getTime() - 40 * PERIOD);
    const c = await competition({ startsAt: past, roundCount: 3 });
    const [a] = await createUsers(1);
    await member(a.id, "أحمد");
    const round = await prisma.quizRound.create({
      data: {
        competitionId: c.id,
        index: 0,
        opensAt: past,
        closesAt: new Date(past.getTime() + PERIOD),
      },
    });
    await prisma.quizAttempt.create({
      data: { roundId: round.id, userId: a.id, score: 50, finishedAt: new Date() },
    });

    const body = await (await winners(c.id)).json();

    expect(body.overall.name).toBe("أحمد");
  });

  it("is closed to an admin without the quiz section", async () => {
    const c = await competition();
    await signInAsAdmin(await createAdmin("members", "MEMBERS"));

    expect((await winners(c.id)).status).toBe(403);
  });
});
