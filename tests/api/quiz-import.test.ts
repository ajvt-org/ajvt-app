import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { resetDb, post, createAdmin, signInAsAdmin } from "./helpers";
import { quiz } from "@/lib/messages";

import { POST as IMPORT } from "@/app/api/admin/quiz/questions/import/route";

const q = (text: string) => ({
  text,
  category: "جغرافيا",
  answers: [
    { text: "نواكشوط", isCorrect: true },
    { text: "نواذيبو", isCorrect: false },
  ],
});

const send = (body: unknown) => IMPORT(post("/api/admin/quiz/questions/import", body));

describe("importing questions in bulk", () => {
  beforeEach(async () => {
    await resetDb();
    await signInAsAdmin(await createAdmin("quizmaster", "QUIZ"));
  });

  it("previews without writing anything", async () => {
    const res = await send({ questions: [q("سؤال أول"), q("سؤال ثان")] });

    const body = await res.json();
    expect(body.accepted).toBe(2);
    expect(body.problems).toEqual([]);
    expect(await prisma.quizQuestion.count()).toBe(0);
  });

  it("writes them once the import is confirmed", async () => {
    await send({ questions: [q("سؤال أول"), q("سؤال ثان")], commit: true });

    expect(await prisma.quizQuestion.count()).toBe(2);
    expect(await prisma.quizAnswer.count()).toBe(4);
  });

  it("keeps the good rows and reports the bad ones", async () => {
    const res = await send({
      questions: [q("سؤال أول"), { ...q("سؤال ثان"), category: "" }],
      commit: true,
    });

    const body = await res.json();
    expect(body.imported).toBe(1);
    expect(body.problems).toEqual([{ index: 1, message: quiz.categoryRequired }]);
    expect(await prisma.quizQuestion.count()).toBe(1);
  });

  it("skips a question the bank already has", async () => {
    await send({ questions: [q("سؤال أول")], commit: true });

    const res = await send({ questions: [q("سؤال أول"), q("سؤال جديد")], commit: true });

    const body = await res.json();
    expect(body.imported).toBe(1);
    expect(body.skipped).toBe(1);
    expect(await prisma.quizQuestion.count()).toBe(2);
  });

  it("matches an existing question through spacing and case", async () => {
    await send({ questions: [q("سؤال أول")], commit: true });

    const res = await send({ questions: [q("  سؤال   أول ")], commit: true });

    expect((await res.json()).skipped).toBe(1);
    expect(await prisma.quizQuestion.count()).toBe(1);
  });

  it("takes the points and correct count from the settings when a row omits them", async () => {
    await send({ questions: [q("سؤال أول")], commit: true });

    const written = await prisma.quizQuestion.findFirstOrThrow();
    expect(written.points).toBe(10);
    expect(written.correctCount).toBe(1);
    expect(written.createdBy).toBe("quizmaster");
  });

  it("keeps the answer order the file gave", async () => {
    await send({ questions: [q("سؤال أول")], commit: true });

    const answers = await prisma.quizAnswer.findMany({ orderBy: { order: "asc" } });
    expect(answers.map((a) => a.text)).toEqual(["نواكشوط", "نواذيبو"]);
    expect(answers[0].isCorrect).toBe(true);
  });

  it("writes nothing when every row is bad", async () => {
    const res = await send({ questions: [{ text: "", category: "" }], commit: true });

    expect((await res.json()).imported).toBe(0);
    expect(await prisma.quizQuestion.count()).toBe(0);
  });

  it("records the import in the action log", async () => {
    await send({ questions: [q("سؤال أول")], commit: true });

    const log = await prisma.auditLog.findFirstOrThrow({
      where: { action: "IMPORT_QUIZ_QUESTIONS" },
    });
    expect(log.adminUsername).toBe("quizmaster");
  });

  it("is closed to an admin without the quiz section", async () => {
    await signInAsAdmin(await createAdmin("members", "MEMBERS"));

    expect((await send({ questions: [q("سؤال أول")] })).status).toBe(403);
  });

  it("refuses a body that is not a list of questions", async () => {
    const res = await send({ questions: "nope", commit: true });

    expect((await res.json()).imported).toBe(0);
  });
});
