import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { resetDb } from "./helpers";
import { TUTORIAL_BANK_ID } from "@/lib/questionBankServer";

import { GET as TUTORIAL } from "@/app/api/quiz/tutorial/route";

async function seed(
  text: string,
  extra: { active?: boolean; order?: number; correctCount?: number; answers?: number } = {},
) {
  const answers = extra.answers ?? 3;
  return prisma.quizQuestion.create({
    data: {
      text,
      category: "تجربة",
      points: 10,
      correctCount: extra.correctCount ?? 1,
      order: extra.order ?? 0,
      active: extra.active ?? true,
      bankId: TUTORIAL_BANK_ID,
      createdBy: "quizmaster",
      answers: {
        create: Array.from({ length: answers }, (_, i) => ({
          text: `خيار ${i}`,
          isCorrect: i === 0,
          order: i,
        })),
      },
    },
  });
}

const read = async () => (await TUTORIAL()).json();

describe("the tutorial a member plays", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("reads nothing from an empty bank rather than failing", async () => {
    const body = await read();

    expect(body.questions).toEqual([]);
  });

  it("carries the clock the settings hold", async () => {
    const body = await read();

    expect(body.curve).toEqual({ fullSeconds: 3, maxSeconds: 10, floorPercent: 50 });
  });

  it("gives every question its options and which of them are right", async () => {
    await seed("ما عاصمة موريتانيا؟");

    const [question] = (await read()).questions;

    expect(question.text).toBe("ما عاصمة موريتانيا؟");
    expect(question.options).toHaveLength(3);
    expect(question.correctIds).toHaveLength(1);
    expect(question.options[0].id).toBe(question.correctIds[0]);
  });

  it("plays the questions in the order the admin arranged", async () => {
    await seed("الثاني", { order: 1 });
    await seed("الأول", { order: 0 });

    const body = await read();

    expect(body.questions.map((q: { text: string }) => q.text)).toEqual(["الأول", "الثاني"]);
  });

  it("leaves out a question the admin disabled", async () => {
    await seed("معطّل", { active: false });
    await seed("مفعّل");

    const body = await read();

    expect(body.questions.map((q: { text: string }) => q.text)).toEqual(["مفعّل"]);
  });

  it("leaves out a question nobody could answer", async () => {
    await seed("بخيار واحد", { answers: 1 });
    await seed("يطلب إجابتين ويحمل واحدة", { correctCount: 2 });
    await seed("سليم");

    const body = await read();

    expect(body.questions.map((q: { text: string }) => q.text)).toEqual(["سليم"]);
  });

  it("reads only the tutorial bank", async () => {
    await prisma.quizQuestion.create({
      data: {
        text: "سؤال عام",
        category: "عام",
        bankId: "general",
        createdBy: "quizmaster",
        answers: {
          create: [
            { text: "أ", isCorrect: true, order: 0 },
            { text: "ب", isCorrect: false, order: 1 },
          ],
        },
      },
    });

    const body = await read();

    expect(body.questions).toEqual([]);
  });
});
