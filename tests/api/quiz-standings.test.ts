import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { resetDb, createUsers, createAdmin, signInAs, signInAsAdmin } from "./helpers";
import { DEFAULT_BANDS } from "@/lib/competitionConfig";

import { GET as STANDINGS } from "@/app/api/quiz/standings/route";
import { getStandings } from "@/lib/quizRankingServer";
import { GET as WINNERS } from "@/app/api/admin/quiz/winners/route";

const START = (() => {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
})();

function dayStamp(offset: number) {
  const d = new Date(`${START}T00:00:00.000Z`);
  d.setUTCDate(d.getUTCDate() + offset);
  return d.toISOString().slice(0, 10);
}

const today = () => dayStamp(1);
const atNoon = (day: string) => new Date(`${day}T12:00:00.000Z`);

async function competition(over: Record<string, unknown> = {}) {
  return prisma.competition.create({
    data: {
      name: "مسابقة",
      startsOn: START,
      days: 30,
      publishMinutes: 0,
      cutoffMinutes: 1439,
      servedCount: 2,
      poolSize: 3,
      weeklyCountingDays: 6,
      speedBands: DEFAULT_BANDS as unknown as object,
      startedAt: new Date(),
      ...over,
    },
  });
}

async function attempt(
  competitionId: string,
  userId: string,
  day: string,
  score: number,
  finishedAt: Date | null = new Date(),
) {
  const quizDay =
    (await prisma.quizDay.findUnique({ where: { competitionId_day: { competitionId, day } } })) ??
    (await prisma.quizDay.create({ data: { competitionId, day } }));
  return prisma.quizAttempt.create({
    data: { dayId: quizDay.id, userId, score, finishedAt },
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

    const body = await (await STANDINGS()).json();

    expect(body.running).toBe(false);
    expect(body.today).toEqual([]);
  });

  it("ranks today by score", async () => {
    const c = await competition();
    const [a, b] = await createUsers(2);
    await member(a.id, "أحمد");
    await member(b.id, "محمد");
    await attempt(c.id, a.id, today(), 30);
    await attempt(c.id, b.id, today(), 50);
    const body = await getStandings(a.id, 10, atNoon(today()));

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
    const body = await getStandings(users[2].id, 10, atNoon(today()));

    expect(body.mine?.today?.rank).toBe(3);
    expect(body.mine?.today?.total).toBe(10);
  });

  it("drops the worst day from the week once the allowance is passed", async () => {
    const c = await competition();
    const [u] = await createUsers(1);
    await member(u.id, "أحمد");
    for (let i = 0; i < 7; i++) await attempt(c.id, u.id, dayStamp(i), i === 0 ? 1 : 10);
    const body = await getStandings(u.id, 10, atNoon(dayStamp(1)));

    expect(body.thisWeek[0].total).toBe(60);
  });

  it("counts nothing for the days a member joined too late for", async () => {
    const c = await competition();
    const [early, late] = await createUsers(2);
    await member(early.id, "مبكر");
    await member(late.id, "متأخر");
    for (let i = 0; i < 3; i++) await attempt(c.id, early.id, dayStamp(i), 10);
    await attempt(c.id, late.id, dayStamp(2), 10);
    const body = await getStandings(late.id, 10, atNoon(dayStamp(2)));

    expect(body.overall[0].name).toBe("مبكر");
    expect(body.overall[0].total).toBe(30);
    expect(body.mine?.overall?.total).toBe(10);
  });

  it("shows a member with no attempt as having no place", async () => {
    await competition();
    const [u] = await createUsers(1);
    await member(u.id, "أحمد");
    await signInAs(u);

    const body = await (await STANDINGS()).json();

    expect(body.mine.today).toBeNull();
  });
});

describe("winners an admin can read", () => {
  beforeEach(async () => {
    await resetDb();
    await signInAsAdmin(await createAdmin("quizmaster", "QUIZ"));
  });

  it("names a winner for each day played", async () => {
    const c = await competition();
    const [a, b] = await createUsers(2);
    await member(a.id, "أحمد");
    await member(b.id, "محمد");
    await attempt(c.id, a.id, dayStamp(0), 50);
    await attempt(c.id, b.id, dayStamp(0), 30);
    await attempt(c.id, b.id, dayStamp(1), 40);

    const body = await (await WINNERS()).json();

    expect(body.days).toHaveLength(2);
    expect(body.days[0].winner.name).toBe("أحمد");
    expect(body.days[1].winner.name).toBe("محمد");
  });

  it("names a weekly winner", async () => {
    const c = await competition();
    const [a] = await createUsers(1);
    await member(a.id, "أحمد");
    await attempt(c.id, a.id, dayStamp(0), 50);

    const body = await (await WINNERS()).json();

    expect(body.weeks[0].week).toBe(0);
    expect(body.weeks[0].winner.name).toBe("أحمد");
  });

  it("holds back the overall winner while the run is still going", async () => {
    const c = await competition();
    const [a] = await createUsers(1);
    await member(a.id, "أحمد");
    await attempt(c.id, a.id, dayStamp(0), 50);

    expect((await (await WINNERS()).json()).overall).toBeNull();
  });

  it("names the overall winner once the run is over", async () => {
    const past = new Date();
    past.setUTCDate(past.getUTCDate() - 40);
    const c = await competition({ startsOn: past.toISOString().slice(0, 10), days: 3 });
    const [a] = await createUsers(1);
    await member(a.id, "أحمد");
    await attempt(c.id, a.id, past.toISOString().slice(0, 10), 50);

    const body = await (await WINNERS()).json();

    expect(body.overall.name).toBe("أحمد");
  });

  it("is closed to an admin without the quiz section", async () => {
    await competition();
    await signInAsAdmin(await createAdmin("members", "MEMBERS"));

    expect((await WINNERS()).status).toBe(403);
  });
});
