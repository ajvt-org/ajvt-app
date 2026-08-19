import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { resetDb, get, post, patch, del, createAdmin, signInAsAdmin, withId } from "./helpers";
import { BANK_NOT_EMPTY, NAME_TAKEN } from "@/lib/questionBankServer";

import { GET as LIST, POST as CREATE } from "@/app/api/admin/quiz/banks/route";
import { PATCH as RENAME, DELETE as REMOVE } from "@/app/api/admin/quiz/banks/[id]/route";
import { GET as QUESTIONS, POST as ADD } from "@/app/api/admin/quiz/questions/route";
import { POST as IMPORT } from "@/app/api/admin/quiz/questions/import/route";

const list = () => LIST();
const create = (name: unknown) => CREATE(post("/api/admin/quiz/banks", { name }));
const rename = (id: string, name: unknown) =>
  RENAME(patch(`/api/admin/quiz/banks/${id}`, { name }), withId(id));
const remove = (id: string) => REMOVE(del(`/api/admin/quiz/banks/${id}`), withId(id));
const questions = (bank?: string) =>
  QUESTIONS(get(`/api/admin/quiz/questions${bank ? `?bank=${bank}` : ""}`));

const addQuestion = (body: Record<string, unknown>) =>
  ADD(
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

async function made(name: string) {
  return (await (await create(name)).json()).bank as { id: string; name: string };
}

describe("banks of questions", () => {
  beforeEach(async () => {
    await resetDb();
    await signInAsAdmin(await createAdmin("quizmaster", "QUIZ"));
  });

  it("starts with the general bank the questions already sit in", async () => {
    const body = await (await list()).json();

    expect(body.banks).toHaveLength(1);
    expect(body.banks[0].name).toBe("البنك العام");
  });

  it("creates a second bank", async () => {
    await create("بنك البدريين");

    const body = await (await list()).json();
    expect(body.banks.map((b: { name: string }) => b.name)).toContain("بنك البدريين");
  });

  it("refuses a bank with no name", async () => {
    expect((await create("  ")).status).toBe(400);
  });

  it("refuses a name another bank already uses", async () => {
    await create("بنك البدريين");

    const res = await create("بنك البدريين");

    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe(NAME_TAKEN);
  });

  it("renames a bank", async () => {
    const bank = await made("بنك مؤقت");

    await rename(bank.id, "بنك الشباب");

    expect((await prisma.questionBank.findUniqueOrThrow({ where: { id: bank.id } })).name).toBe(
      "بنك الشباب",
    );
  });

  it("deletes an empty bank", async () => {
    const bank = await made("بنك فارغ");

    expect((await remove(bank.id)).status).toBe(200);
    expect(await prisma.questionBank.count()).toBe(1);
  });

  it("refuses to delete a bank that still holds questions", async () => {
    const bank = await made("بنك ممتلئ");
    await addQuestion({ bankId: bank.id });

    const res = await remove(bank.id);

    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe(BANK_NOT_EMPTY);
  });

  it("says nothing found for a bank that does not exist", async () => {
    expect((await rename("nope", "اسم")).status).toBe(404);
    expect((await remove("nope")).status).toBe(404);
  });

  it("counts the questions each bank holds", async () => {
    const bank = await made("بنك البدريين");
    await addQuestion({ bankId: bank.id });

    const body = await (await list()).json();
    const row = body.banks.find((b: { id: string }) => b.id === bank.id);
    expect(row._count.questions).toBe(1);
  });
});

describe("questions inside a bank", () => {
  beforeEach(async () => {
    await resetDb();
    await signInAsAdmin(await createAdmin("quizmaster", "QUIZ"));
  });

  it("puts a question with no bank named in the general one", async () => {
    await addQuestion({});

    const question = await prisma.quizQuestion.findFirstOrThrow();
    expect(question.bankId).toBe("general");
  });

  it("puts a question in the bank it names", async () => {
    const bank = await made("بنك البدريين");

    await addQuestion({ bankId: bank.id, text: "سؤال خاص" });

    const question = await prisma.quizQuestion.findFirstOrThrow({ where: { text: "سؤال خاص" } });
    expect(question.bankId).toBe(bank.id);
  });

  it("refuses a question for a bank that does not exist", async () => {
    expect((await addQuestion({ bankId: "nope" })).status).toBe(404);
  });

  it("lists only the questions of the bank asked for", async () => {
    const bank = await made("بنك البدريين");
    await addQuestion({ text: "سؤال عام" });
    await addQuestion({ bankId: bank.id, text: "سؤال خاص" });

    const mine = await (await questions(bank.id)).json();
    const general = await (await questions()).json();

    expect(mine.questions.map((q: { text: string }) => q.text)).toEqual(["سؤال خاص"]);
    expect(general.questions.map((q: { text: string }) => q.text)).toEqual(["سؤال عام"]);
  });

  it("says which bank it listed", async () => {
    const body = await (await questions()).json();

    expect(body.bank.name).toBe("البنك العام");
  });

  it("imports into the bank it is given", async () => {
    const bank = await made("بنك البدريين");

    await IMPORT(
      post("/api/admin/quiz/questions/import", {
        bankId: bank.id,
        commit: true,
        questions: [
          {
            text: "سؤال مستورد",
            category: "عام",
            answers: [
              { text: "أ", isCorrect: true },
              { text: "ب", isCorrect: false },
            ],
          },
        ],
      }),
    );

    const question = await prisma.quizQuestion.findFirstOrThrow({ where: { text: "سؤال مستورد" } });
    expect(question.bankId).toBe(bank.id);
  });

  it("lets the same text exist once in each bank", async () => {
    const bank = await made("بنك البدريين");
    const body = {
      commit: true,
      questions: [
        {
          text: "مكرر",
          category: "عام",
          answers: [
            { text: "أ", isCorrect: true },
            { text: "ب", isCorrect: false },
          ],
        },
      ],
    };

    await IMPORT(post("/api/admin/quiz/questions/import", body));
    await IMPORT(post("/api/admin/quiz/questions/import", { ...body, bankId: bank.id }));

    expect(await prisma.quizQuestion.count({ where: { text: "مكرر" } })).toBe(2);
  });

  it("is closed to an admin without the quiz section", async () => {
    await signInAsAdmin(await createAdmin("members", "MEMBERS"));

    expect((await list()).status).toBe(403);
    expect((await create("بنك")).status).toBe(403);
  });
});
