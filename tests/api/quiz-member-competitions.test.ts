import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { resetDb, createUsers, signInAs, makeMember } from "./helpers";
import { DEFAULT_BOARDS, DEFAULT_CURVE } from "@/lib/competitionConfig";

import { GET as MINE } from "@/app/api/quiz/competitions/route";

async function competition(over: Record<string, unknown> = {}) {
  return prisma.competition.create({
    data: {
      name: "مسابقة",
      startsAt: new Date("2026-08-20T08:00:00.000Z"),
      roundCount: 3,
      roundPeriodMinutes: 1440,
      roundWindowMinutes: 840,
      servedCount: 3,
      boards: { create: DEFAULT_BOARDS.map((b, order) => ({ ...b, order })) },
      ...DEFAULT_CURVE,
      startedAt: new Date(),
      ...over,
    },
  });
}

async function paidMember(paid = 100) {
  const [user] = await createUsers(1);
  await makeMember({
    userId: user.id,
    fullName: "أحمد",
    age: "البدريين",
    paymentMethod: "بنكيلي",
    status: "ACTIVE",
    paidAmount: paid,
  });
  await signInAs(user);
  return user;
}

const mine = () => MINE();

describe("the competitions a member may play", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("lists a public competition that has started", async () => {
    await competition();
    await paidMember();

    const body = await (await mine()).json();

    expect(body.competitions.map((c: { name: string }) => c.name)).toEqual(["مسابقة"]);
  });

  it("hides one that has not started", async () => {
    await competition({ startedAt: null });
    await paidMember();

    expect((await (await mine()).json()).competitions).toEqual([]);
  });

  it("hides a private competition the member is not on", async () => {
    await competition({ visibility: "PRIVATE" });
    await paidMember();

    expect((await (await mine()).json()).competitions).toEqual([]);
  });

  it("shows a private competition the member is on", async () => {
    const c = await competition({ visibility: "PRIVATE" });
    const user = await paidMember();
    await prisma.quizParticipant.create({ data: { competitionId: c.id, userId: user.id } });

    expect((await (await mine()).json()).competitions).toHaveLength(1);
  });

  it("lists several running at once", async () => {
    await competition();
    await competition({ name: "مسابقة أخرى" });
    await paidMember();

    expect((await (await mine()).json()).competitions).toHaveLength(2);
  });

  it("shows a member who has not paid the standings without the play controls", async () => {
    await competition();
    await paidMember(0);

    const res = await mine();
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.canPlay).toBe(false);
    expect(body.signedIn).toBe(true);
    expect(body.competitions.map((c: { name: string }) => c.name)).toEqual(["مسابقة"]);
  });

  it("keeps a private competition away from a member who has not paid", async () => {
    await competition({ visibility: "PRIVATE", name: "خاصة" });
    await paidMember(0);

    const body = await (await mine()).json();

    expect(body.competitions).toEqual([]);
  });

  it("carries the live confirm flag for the tutorial", async () => {
    await competition();
    await paidMember();
    await prisma.quizSettings.create({ data: { id: "singleton", confirmAnswers: false } });

    expect((await (await mine()).json()).confirmAnswers).toBe(false);
  });
});
