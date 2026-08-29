import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { resetDb, get, createUsers, signInAs, makeMember } from "./helpers";
import { DEFAULT_BOARDS, DEFAULT_CURVE } from "@/lib/competitionConfig";

import { GET as RECAP } from "@/app/api/quiz/recap/route";

const DAY = 86_400_000;
const HOUR = 3_600_000;

async function competition(over: Record<string, unknown> = {}) {
  return prisma.competition.create({
    data: {
      name: "مسابقة",
      startsAt: new Date(Date.now() - 4 * DAY),
      roundCount: 3,
      roundPeriodMinutes: 1440,
      roundWindowMinutes: 840,
      servedCount: 2,
      boards: { create: DEFAULT_BOARDS.map((b, order) => ({ ...b, order })) },
      ...DEFAULT_CURVE,
      startedAt: new Date(),
      ...over,
    },
  });
}

async function paidUser(name = "أحمد") {
  const [user] = await createUsers(1);
  await makeMember({
    userId: user.id,
    fullName: name,
    age: "البدريين",
    paymentMethod: "بنكيلي",
    status: "ACTIVE",
    paidAmount: 100,
  });
  return user;
}

async function question(text: string, right = "صحيح") {
  return prisma.quizQuestion.create({
    data: {
      text,
      category: "جغرافيا",
      points: 10,
      createdBy: "admin",
      answers: {
        create: [
          { text: right, isCorrect: true, order: 0 },
          { text: "خطأ", isCorrect: false, order: 1 },
        ],
      },
    },
  });
}

async function closedRound(competitionId: string, index: number, questionIds: string[], ago = DAY) {
  const closesAt = new Date(Date.now() - ago);
  return prisma.quizRound.create({
    data: {
      competitionId,
      index,
      category: "جغرافيا",
      opensAt: new Date(closesAt.getTime() - 14 * HOUR),
      closesAt,
      questions: { create: questionIds.map((questionId) => ({ questionId })) },
    },
  });
}

async function played(
  roundId: string,
  userId: string,
  questionIds: string[],
  marks: (boolean | null)[],
  voided = false,
) {
  return prisma.quizAttempt.create({
    data: {
      roundId,
      userId,
      score: 0,
      finishedAt: new Date(),
      voidedAt: voided ? new Date() : null,
      answers: {
        create: questionIds.map((questionId, position) => ({
          questionId,
          position,
          isCorrect: marks[position],
        })),
      },
    },
  });
}

function recapOf(competitionId: string) {
  return RECAP(get(`/api/quiz/recap?competition=${competitionId}`));
}

describe("yesterday's questions", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("shows the questions and their answers to a member who never played the round", async () => {
    const c = await competition();
    const q = await question("ما عاصمة موريتانيا؟", "نواكشوط");
    const round = await closedRound(c.id, 0, [q.id]);
    const player = await paidUser("لاعب");
    await played(round.id, player.id, [q.id], [true]);

    const watcher = await paidUser("متفرج");
    await signInAs(watcher);

    const { recap } = await (await recapOf(c.id)).json();

    expect(recap.round).toBe(0);
    expect(recap.questions).toHaveLength(1);
    expect(recap.questions[0].text).toBe("ما عاصمة موريتانيا؟");
    expect(recap.questions[0].correct).toEqual(["نواكشوط"]);
  });

  it("reads the correct-answer rate over the members who answered", async () => {
    const c = await competition();
    const q = await question("سؤال");
    const round = await closedRound(c.id, 0, [q.id]);
    const [right, wrong, quiet] = [await paidUser("أ"), await paidUser("ب"), await paidUser("ج")];
    await played(round.id, right.id, [q.id], [true]);
    await played(round.id, wrong.id, [q.id], [false]);
    await played(round.id, quiet.id, [q.id], [null]);
    await signInAs(right);

    const { recap } = await (await recapOf(c.id)).json();

    expect(recap.questions[0].answered).toBe(2);
    expect(recap.questions[0].right).toBe(1);
    expect(recap.questions[0].rate).toBe(50);
    expect(recap.players).toBe(3);
  });

  it("has no rate for a question nobody answered", async () => {
    const c = await competition();
    const q = await question("سؤال متروك");
    const round = await closedRound(c.id, 0, [q.id]);
    const player = await paidUser();
    await played(round.id, player.id, [q.id], [null]);
    await signInAs(player);

    const { recap } = await (await recapOf(c.id)).json();

    expect(recap.questions[0].answered).toBe(0);
    expect(recap.questions[0].rate).toBeNull();
  });

  it("leaves a voided attempt out of the rate", async () => {
    const c = await competition();
    const q = await question("سؤال");
    const round = await closedRound(c.id, 0, [q.id]);
    const honest = await paidUser("أ");
    const cheat = await paidUser("ب");
    await played(round.id, honest.id, [q.id], [false]);
    await played(round.id, cheat.id, [q.id], [true], true);
    await signInAs(honest);

    const { recap } = await (await recapOf(c.id)).json();

    expect(recap.questions[0].answered).toBe(1);
    expect(recap.questions[0].rate).toBe(0);
    expect(recap.players).toBe(1);
  });

  it("takes the last round that closed when several are behind us", async () => {
    const c = await competition();
    const old = await question("سؤال قديم");
    const fresh = await question("سؤال أمس");
    await closedRound(c.id, 0, [old.id], 2 * DAY);
    await closedRound(c.id, 1, [fresh.id], DAY);
    const user = await paidUser();
    await signInAs(user);

    const { recap } = await (await recapOf(c.id)).json();

    expect(recap.round).toBe(1);
    expect(recap.questions.map((q: { text: string }) => q.text)).toEqual(["سؤال أمس"]);
  });

  it("has nothing to show while the only round is still open", async () => {
    const c = await competition();
    const q = await question("سؤال");
    await closedRound(c.id, 0, [q.id], -HOUR);
    const user = await paidUser();
    await signInAs(user);

    const { recap } = await (await recapOf(c.id)).json();

    expect(recap).toBeNull();
  });

  it("is closed to a member who has not paid", async () => {
    const c = await competition();
    const [user] = await createUsers(1);
    await signInAs(user);

    expect((await recapOf(c.id)).status).toBe(403);
  });

  it("is closed to a member outside a private competition", async () => {
    const c = await competition({ visibility: "PRIVATE" });
    const q = await question("سؤال");
    await closedRound(c.id, 0, [q.id]);
    const outsider = await paidUser();
    await signInAs(outsider);

    expect((await recapOf(c.id)).status).toBe(403);
  });

  it("refuses a request that names no competition", async () => {
    const user = await paidUser();
    await signInAs(user);

    expect((await RECAP(get("/api/quiz/recap"))).status).toBe(400);
  });
});
