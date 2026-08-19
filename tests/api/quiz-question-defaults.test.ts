import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { resetDb, post, patch, createAdmin, signInAsAdmin } from "./helpers";

import { GET as READ, PATCH as SAVE } from "@/app/api/admin/quiz/settings/route";
import { POST as ADD_QUESTION } from "@/app/api/admin/quiz/questions/route";

const save = (body: unknown) => SAVE(patch("/api/admin/quiz/settings", body));

const question = (body: Record<string, unknown>) =>
  ADD_QUESTION(
    post("/api/admin/quiz/questions", {
      text: "سؤال",
      category: "عام",
      answers: [
        { text: "أ", isCorrect: true },
        { text: "ب", isCorrect: false },
      ],
      ...body,
    }),
  );

describe("the defaults a new question starts from", () => {
  beforeEach(async () => {
    await resetDb();
    await signInAsAdmin(await createAdmin("quizmaster", "QUIZ"));
  });

  it("hands back the defaults it holds", async () => {
    const body = await (await READ()).json();

    expect(body.settings.defaultAnswerCount).toBe(4);
    expect(body.settings.defaultCorrectCount).toBe(1);
    expect(body.settings.defaultPoints).toBe(10);
  });

  it("saves what an admin changed", async () => {
    await save({ defaultAnswerCount: 3, defaultCorrectCount: 2, defaultPoints: 15 });

    const settings = await prisma.quizSettings.findUniqueOrThrow({ where: { id: "singleton" } });
    expect(settings.defaultAnswerCount).toBe(3);
    expect(settings.defaultPoints).toBe(15);
  });

  it("refuses more right answers than answers", async () => {
    const res = await save({ defaultAnswerCount: 2, defaultCorrectCount: 3 });

    expect(res.status).toBe(400);
  });

  it("refuses points outside the range a difficulty is read from", async () => {
    expect((await save({ defaultPoints: 40 })).status).toBe(400);
    expect((await save({ defaultPoints: 0 })).status).toBe(400);
  });

  it("refuses a value that is not a whole number", async () => {
    expect((await save({ defaultAnswerCount: 2.5 })).status).toBe(400);
  });

  it("gives a question with no points the default", async () => {
    await save({ defaultPoints: 15 });

    await question({});

    expect((await prisma.quizQuestion.findFirstOrThrow()).points).toBe(15);
  });

  it("leaves a question that named its own points alone", async () => {
    await save({ defaultPoints: 15 });

    await question({ points: 20 });

    expect((await prisma.quizQuestion.findFirstOrThrow()).points).toBe(20);
  });

  it("is closed to an admin without the quiz section", async () => {
    await signInAsAdmin(await createAdmin("members", "MEMBERS"));

    expect((await READ()).status).toBe(403);
    expect((await save({ defaultPoints: 12 })).status).toBe(403);
  });
});
