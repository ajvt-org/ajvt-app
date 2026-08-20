import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { resetDb, get, createUsers, createAdmin, signInAs, signInAsAdmin, withId } from "./helpers";
import { DEFAULT_BOARDS, DEFAULT_CURVE } from "@/lib/competitionConfig";

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
  WINNERS(get(`/api/admin/quiz/competitions/${id}/winners`), withId(id));
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
      boards: { create: DEFAULT_BOARDS.map((b, order) => ({ ...b, order })) },
      ...DEFAULT_CURVE,
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
    expect(body.boards).toEqual([]);
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
    expect(body.boards[0].title).toBe("ترتيب الجولة");
    expect(body.boards[0].rows.map((r) => r.name)).toEqual(["محمد", "أحمد"]);
    expect(body.boards[0].rows[0].rank).toBe(1);
  });

  it("says how many blocks each board has gathered", async () => {
    const c = await competition();
    const [a] = await createUsers(1);
    await member(a.id, "أحمد");
    await attempt(c.id, a.id, today(), 30);
    const body = await getStandings(c.id, a.id, 10, atNoon(today()));

    const round = body.boards.find((b) => b.title === "ترتيب الجولة");
    const overall = body.boards.find((b) => b.title === "الترتيب العام");
    expect(round?.block).toBe(today());
    expect(round?.blocks).toBe(today() + 1);
    expect(overall?.blocks).toBe(1);
  });

  it("hands back the ranking of a past block", async () => {
    const { boardBlock } = await import("@/lib/quizRankingServer");
    const c = await competition();
    const [a, b] = await createUsers(2);
    await member(a.id, "أحمد");
    await member(b.id, "محمد");
    await attempt(c.id, a.id, 0, 30);
    await attempt(c.id, b.id, 0, 50);
    await attempt(c.id, a.id, today(), 70);
    const board = (await prisma.quizBoard.findFirstOrThrow({
      where: { competitionId: c.id, title: "ترتيب الجولة" },
    })) as { id: string };

    const past = await boardBlock(c.id, board.id, 0, a.id, 10, atNoon(today()));

    expect(past.rows.map((r) => r.name)).toEqual(["محمد", "أحمد"]);
    expect(past.mine?.rank).toBe(2);
  });

  it("counts a custom board's blocks off the quiz clock, not the member's play", async () => {
    const { boardBlock } = await import("@/lib/quizRankingServer");
    const c = await competition({
      boards: {
        create: [
          { title: "ترتيب الجولة 2", blockTitle: "", blockRounds: 3, counting: 2, order: 0 },
        ],
      },
    });
    const [a, b] = await createUsers(2);
    await member(a.id, "أحمد");
    await member(b.id, "محمد");
    await attempt(c.id, b.id, 0, 30);
    await attempt(c.id, b.id, 4, 50);

    const body = await getStandings(c.id, a.id, 10, atNoon(4));
    const custom = body.boards.find((x) => x.title === "ترتيب الجولة 2");

    expect(custom?.blocks).toBe(2);
    expect(custom?.block).toBe(1);

    const past = await boardBlock(c.id, custom!.id, 0, a.id, 10, atNoon(4));
    expect(past.rows.map((r) => r.name)).toEqual(["محمد"]);
    expect(past.rows[0].total).toBe(30);
  });

  it("tells the member their own place even outside the top", async () => {
    const c = await competition();
    const users = await createUsers(3);
    for (const [i, u] of users.entries()) {
      await member(u.id, `عضو ${i}`);
      await attempt(c.id, u.id, today(), (3 - i) * 10);
    }
    const body = await getStandings(c.id, users[2].id, 10, atNoon(today()));

    expect(body.boards[0].mine?.rank).toBe(3);
    expect(body.boards[0].mine?.total).toBe(10);
  });

  it("drops the worst round from the group once the allowance is passed", async () => {
    const c = await competition();
    const [u] = await createUsers(1);
    await member(u.id, "أحمد");
    for (let i = 0; i < 7; i++) await attempt(c.id, u.id, roundIndex(i), i === 0 ? 1 : 10);
    const body = await getStandings(c.id, u.id, 10, atNoon(roundIndex(1)));

    expect(body.boards[1].rows[0].total).toBe(60);
  });

  it("counts nothing for the rounds a member joined too late for", async () => {
    const c = await competition();
    const [early, late] = await createUsers(2);
    await member(early.id, "مبكر");
    await member(late.id, "متأخر");
    for (let i = 0; i < 3; i++) await attempt(c.id, early.id, roundIndex(i), 10);
    await attempt(c.id, late.id, roundIndex(2), 10);
    const body = await getStandings(c.id, late.id, 10, atNoon(roundIndex(2)));

    expect(body.boards[2].rows[0].name).toBe("مبكر");
    expect(body.boards[2].rows[0].total).toBe(30);
    expect(body.boards[2].mine?.total).toBe(10);
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

    expect(body.boards[0].mine).toBeNull();
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

    const daily = body.boards[0];
    expect(daily.title).toBe("ترتيب الجولة");
    expect(daily.winners).toHaveLength(2);
    expect(daily.winners[0].winner.name).toBe("أحمد");
    expect(daily.winners[1].winner.name).toBe("محمد");
  });

  it("names a block winner", async () => {
    const c = await competition();
    const [a] = await createUsers(1);
    await member(a.id, "أحمد");
    await attempt(c.id, a.id, roundIndex(0), 50);

    const body = await (await winners(c.id)).json();

    const weekly = body.boards[1];
    expect(weekly.winners[0].block).toBe(0);
    expect(weekly.winners[0].winner.name).toBe("أحمد");
  });

  it("holds back the overall winner while the run is still going", async () => {
    const c = await competition();
    const [a] = await createUsers(1);
    await member(a.id, "أحمد");
    await attempt(c.id, a.id, roundIndex(0), 50);

    const body = await (await winners(c.id)).json();
    expect(body.boards[2].wholeRun).toBe(true);
    expect(body.boards[2].winners[0].winner).toBeNull();
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

    expect(body.boards[2].winners[0].winner.name).toBe("أحمد");
  });

  it("is closed to an admin without the quiz section", async () => {
    const c = await competition();
    await signInAsAdmin(await createAdmin("members", "MEMBERS"));

    expect((await winners(c.id)).status).toBe(403);
  });
});
