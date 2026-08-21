import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { DEFAULT_BOARDS, DEFAULT_CURVE } from "@/lib/competitionConfig";
import { getStandings } from "@/lib/quizRankingServer";
import { resetDb, del, createUsers, createAdmin, signInAsAdmin, withId } from "./helpers";

import { DELETE as REMOVE_MEMBER } from "@/app/api/admin/members/[id]/route";

const START = new Date("2026-08-01T08:00:00.000Z");
const PERIOD = 1440 * 60_000;
const AT = new Date(START.getTime() + PERIOD + 1000);

async function competition() {
  return prisma.competition.create({
    data: {
      name: "مسابقة",
      startsAt: START,
      roundCount: 3,
      roundPeriodMinutes: 1440,
      roundWindowMinutes: 1440,
      servedCount: 2,
      boards: { create: DEFAULT_BOARDS.map((b, order) => ({ ...b, order })) },
      ...DEFAULT_CURVE,
      startedAt: START,
    },
  });
}

async function played(competitionId: string, userId: string, index: number, score: number) {
  const opensAt = new Date(START.getTime() + index * PERIOD);
  const round =
    (await prisma.quizRound.findUnique({
      where: { competitionId_index: { competitionId, index } },
    })) ??
    (await prisma.quizRound.create({
      data: { competitionId, index, opensAt, closesAt: new Date(opensAt.getTime() + PERIOD) },
    }));
  return prisma.quizAttempt.create({
    data: { roundId: round.id, userId, score, finishedAt: opensAt },
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

const removeMember = (id: string, confirmName: string) =>
  REMOVE_MEMBER(del(`/api/admin/members/${id}`, { confirmName }), withId(id));

describe("deleting a member", () => {
  beforeEach(async () => {
    await resetDb();
    await signInAsAdmin(await createAdmin("boss", "SUPER"));
  });

  it("takes them off the standings they were on", async () => {
    const c = await competition();
    const [leaving, staying] = await createUsers(2);
    const gone = await member(leaving.id, "راحل");
    await member(staying.id, "باق");
    await played(c.id, leaving.id, 1, 90);
    await played(c.id, staying.id, 1, 40);

    expect((await removeMember(gone.id, "راحل")).status).toBe(200);

    const rows = (await getStandings(c.id, staying.id, 10, AT)).boards[0].rows;
    expect(rows.map((r) => r.name)).toEqual(["باق"]);
  });

  it("leaves no attempt or answer of theirs behind", async () => {
    const c = await competition();
    const [leaving] = await createUsers(1);
    const gone = await member(leaving.id, "راحل");
    const attempt = await played(c.id, leaving.id, 1, 90);
    await prisma.quizAttemptAnswer.create({
      data: {
        attemptId: attempt.id,
        questionId: (
          await prisma.quizQuestion.create({
            data: { text: "س", category: "عام", createdBy: "admin" },
          })
        ).id,
        position: 0,
      },
    });

    await removeMember(gone.id, "راحل");

    expect(await prisma.quizAttempt.count({ where: { userId: leaving.id } })).toBe(0);
    expect(await prisma.quizAttemptAnswer.count()).toBe(0);
  });

  it("takes them off the list of a private competition", async () => {
    const c = await competition();
    const [leaving] = await createUsers(1);
    const gone = await member(leaving.id, "راحل");
    await prisma.quizParticipant.create({ data: { competitionId: c.id, userId: leaving.id } });

    await removeMember(gone.id, "راحل");

    expect(await prisma.quizParticipant.count({ where: { userId: leaving.id } })).toBe(0);
  });

  it("leaves the other members' rounds alone", async () => {
    const c = await competition();
    const [leaving, staying] = await createUsers(2);
    const gone = await member(leaving.id, "راحل");
    await member(staying.id, "باق");
    await played(c.id, leaving.id, 1, 90);
    await played(c.id, staying.id, 1, 40);

    await removeMember(gone.id, "راحل");

    expect(await prisma.quizAttempt.count({ where: { userId: staying.id } })).toBe(1);
  });

  it("says what it forgot in the audit entry", async () => {
    const c = await competition();
    const [leaving] = await createUsers(1);
    const gone = await member(leaving.id, "راحل");
    await played(c.id, leaving.id, 1, 90);

    await removeMember(gone.id, "راحل");

    const entry = await prisma.auditLog.findFirstOrThrow({ where: { action: "DELETE_MEMBER" } });
    expect(JSON.stringify(entry.meta)).toContain("attempts");
  });
});
