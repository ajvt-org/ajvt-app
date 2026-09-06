import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { resetDb, get, post, patch, createAdmin, signInAsAdmin, withId } from "./helpers";
import { TUTORIAL_BANK_ID } from "@/lib/questionBankServer";

import { GET as QUESTIONS, POST as ADD } from "@/app/api/admin/quiz/questions/route";
import { POST as MOVE } from "@/app/api/admin/quiz/questions/[id]/move/route";
import { GET as SETTINGS, PATCH as SAVE } from "@/app/api/admin/quiz/settings/route";

const listing = (bank: string) => QUESTIONS(get(`/api/admin/quiz/questions?bank=${bank}`));
const move = (id: string, direction: unknown) =>
  MOVE(post(`/api/admin/quiz/questions/${id}/move`, { direction }), withId(id));
const saveSettings = (body: Record<string, unknown>) =>
  SAVE(patch("/api/admin/quiz/settings", body));

const addQuestion = (text: string) =>
  ADD(
    post("/api/admin/quiz/questions", {
      bankId: TUTORIAL_BANK_ID,
      text,
      category: "تجربة",
      answers: [
        { text: "أ", isCorrect: true },
        { text: "ب", isCorrect: false },
      ],
    }),
  );

async function texts() {
  const body = await (await listing(TUTORIAL_BANK_ID)).json();
  return body.questions.map((question: { text: string }) => question.text);
}

async function idOf(text: string) {
  return (await prisma.quizQuestion.findFirstOrThrow({ where: { text } })).id;
}

describe("ordering the questions of a bank", () => {
  beforeEach(async () => {
    await resetDb();
    await signInAsAdmin(await createAdmin("quizmaster", "QUIZ"));
    for (const text of ["الأول", "الثاني", "الثالث"]) await addQuestion(text);
  });

  it("lists a bank that was never ordered newest first", async () => {
    expect(await texts()).toEqual(["الثالث", "الثاني", "الأول"]);
  });

  it("moves a question up one place", async () => {
    await move(await idOf("الثاني"), "up");

    expect(await texts()).toEqual(["الثاني", "الثالث", "الأول"]);
  });

  it("moves a question down one place", async () => {
    await move(await idOf("الثالث"), "down");

    expect(await texts()).toEqual(["الثاني", "الثالث", "الأول"]);
  });

  it("leaves the first question where it is", async () => {
    await move(await idOf("الثالث"), "up");

    expect(await texts()).toEqual(["الثالث", "الثاني", "الأول"]);
  });

  it("keeps the order it was given across later reads", async () => {
    await move(await idOf("الأول"), "up");
    await move(await idOf("الأول"), "up");

    expect(await texts()).toEqual(["الأول", "الثالث", "الثاني"]);
  });

  it("refuses a direction it does not know", async () => {
    expect((await move(await idOf("الأول"), "sideways")).status).toBe(400);
  });

  it("says nothing found for a question that does not exist", async () => {
    expect((await move("nope", "up")).status).toBe(404);
  });

  it("does not disturb another bank", async () => {
    await ADD(
      post("/api/admin/quiz/questions", {
        text: "سؤال عام",
        category: "عام",
        answers: [
          { text: "أ", isCorrect: true },
          { text: "ب", isCorrect: false },
        ],
      }),
    );

    await move(await idOf("الأول"), "up");

    const general = await (await QUESTIONS(get("/api/admin/quiz/questions"))).json();
    expect(general.questions.map((q: { text: string }) => q.text)).toEqual(["سؤال عام"]);
  });
});

describe("the tutorial clock", () => {
  beforeEach(async () => {
    await resetDb();
    await signInAsAdmin(await createAdmin("quizmaster", "QUIZ"));
  });

  it("starts on the clock the tutorial has always run on", async () => {
    const body = await (await SETTINGS()).json();

    expect(body.settings.tutorialFullSeconds).toBe(3);
    expect(body.settings.tutorialMaxSeconds).toBe(10);
    expect(body.settings.tutorialFloorPercent).toBe(50);
  });

  it("saves a clock an admin gives it", async () => {
    await saveSettings({ tutorialFullSeconds: 5, tutorialMaxSeconds: 20 });

    const body = await (await SETTINGS()).json();
    expect(body.settings.tutorialFullSeconds).toBe(5);
    expect(body.settings.tutorialMaxSeconds).toBe(20);
  });

  it("refuses a question shorter than its own full marks window", async () => {
    const res = await saveSettings({ tutorialFullSeconds: 30 });

    expect(res.status).toBe(400);
  });

  it("refuses a floor above a hundred", async () => {
    expect((await saveSettings({ tutorialFloorPercent: 140 })).status).toBe(400);
  });

  it("takes a floor of zero", async () => {
    expect((await saveSettings({ tutorialFloorPercent: 0 })).status).toBe(200);
  });

  it("leaves the question defaults alone when only the clock is sent", async () => {
    await saveSettings({ tutorialMaxSeconds: 25 });

    const body = await (await SETTINGS()).json();
    expect(body.settings.defaultPoints).toBe(10);
  });
});
