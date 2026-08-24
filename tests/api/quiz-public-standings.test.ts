import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { resetDb, get, createUsers, signInAs } from "./helpers";
import { clearCookies } from "./cookieJar";
import { DEFAULT_BOARDS, DEFAULT_CURVE } from "@/lib/competitionConfig";

import { GET as STANDINGS } from "@/app/api/quiz/standings/route";
import { GET as PUBLIC_COMPETITIONS } from "@/app/api/quiz/competitions/public/route";

const START = (() => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  d.setUTCHours(0, 0, 0, 0);
  return d;
})();

const PERIOD = 1440 * 60_000;

const standings = (id?: string) =>
  STANDINGS(get(id ? `/api/quiz/standings?competition=${id}` : "/api/quiz/standings"));
const competitions = () => PUBLIC_COMPETITIONS();

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

async function attempt(competitionId: string, userId: string, index: number, score: number) {
  const round = await prisma.quizRound.create({
    data: {
      competitionId,
      index,
      opensAt: new Date(START.getTime() + index * PERIOD),
      closesAt: new Date(START.getTime() + (index + 1) * PERIOD),
    },
  });
  return prisma.quizAttempt.create({
    data: { roundId: round.id, userId, score, finishedAt: new Date() },
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

describe("standings without an account", () => {
  beforeEach(async () => {
    await resetDb();
    clearCookies();
  });

  it("ranks a public competition for a visitor", async () => {
    const c = await competition();
    const [a] = await createUsers(1);
    await member(a.id, "أحمد");
    await attempt(c.id, a.id, 1, 30);

    const body = await (await standings(c.id)).json();

    expect(body.running).toBe(true);
    expect(body.competitionId).toBe(c.id);
    expect(body.boards.length).toBeGreaterThan(0);
  });

  it("carries no personal standing for a visitor", async () => {
    const c = await competition();
    const [a] = await createUsers(1);
    await member(a.id, "أحمد");
    await attempt(c.id, a.id, 1, 30);

    const body = await (await standings(c.id)).json();

    expect(body.meId).toBeNull();
    expect(body.me).toBeNull();
    expect(body.boards.every((b: { mine: unknown }) => b.mine === null)).toBe(true);
  });

  it("keeps a private competition out of reach of a visitor", async () => {
    const c = await competition({ visibility: "PRIVATE" });

    const body = await (await standings(c.id)).json();

    expect(body.running).toBe(false);
    expect(body.competitionId).toBeNull();
  });

  it("lists only the public competitions and refuses play", async () => {
    const open = await competition();
    await competition({ visibility: "PRIVATE", name: "خاصة" });

    const body = await (await competitions()).json();

    expect(body.canPlay).toBe(false);
    expect(body.competitions.map((c: { id: string }) => c.id)).toEqual([open.id]);
  });

  it("still answers a signed in member with their own standing", async () => {
    const c = await competition();
    const [a] = await createUsers(1);
    await member(a.id, "أحمد");
    await attempt(c.id, a.id, 1, 30);
    await signInAs(a);

    const body = await (await standings(c.id)).json();

    expect(body.meId).toBe(a.id);
  });
});
