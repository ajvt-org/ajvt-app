import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { DEFAULT_BOARDS, DEFAULT_CURVE } from "@/lib/competitionConfig";
import { resetDb, get, put, post, createAdmin, signInAsAdmin, withId } from "./helpers";

import { POST as COPY } from "@/app/api/admin/quiz/competitions/[id]/copy/route";
import { GET as READ, PUT as SAVE } from "@/app/api/admin/quiz/competitions/[id]/route";
import { POST as CREATE } from "@/app/api/admin/quiz/competitions/route";
import { POST as START } from "@/app/api/admin/quiz/competitions/[id]/start/route";

async function competition(name = "مسابقة") {
  return prisma.competition.create({
    data: {
      name,
      startsAt: new Date(Date.now() + 3 * 86_400_000),
      roundCount: 5,
      roundPeriodMinutes: 1440,
      roundWindowMinutes: 840,
      servedCount: 10,
      boards: { create: DEFAULT_BOARDS.map((b, order) => ({ ...b, order })) },
      ...DEFAULT_CURVE,
    },
  });
}

async function draftOf(competitionId: string) {
  const body = await (await READ(get("/x"), withId(competitionId))).json();
  const { id, startedAt, ...rest } = body.competition;
  void id;
  void startedAt;
  return rest;
}

describe("every competition a write hands back", () => {
  beforeEach(async () => {
    await resetDb();
    await signInAsAdmin(await createAdmin("quizmaster", "QUIZ"));
  });

  it("carries its boards when it is read", async () => {
    const c = await competition();

    const body = await (await READ(get("/x"), withId(c.id))).json();

    expect(body.competition.boards).toHaveLength(DEFAULT_BOARDS.length);
  });

  it("carries its boards when it is saved, which is what the editor re-renders from", async () => {
    const c = await competition();
    const draft = await draftOf(c.id);

    const body = await (await SAVE(put("/x", { ...draft, name: "معدل" }), withId(c.id))).json();

    expect(body.competition.boards).toHaveLength(DEFAULT_BOARDS.length);
  });

  it("carries its boards when it is created", async () => {
    const c = await competition();
    const draft = await draftOf(c.id);

    const body = await (await CREATE(post("/x", { ...draft, name: "جديد" }))).json();

    expect(body.competition.boards).toHaveLength(DEFAULT_BOARDS.length);
  });

  it("carries its boards when it is copied", async () => {
    const c = await competition();

    const body = await (await COPY(post("/x", {}), withId(c.id))).json();

    expect(body.competition.boards).toHaveLength(DEFAULT_BOARDS.length);
  });

  it("carries its boards when it is started", async () => {
    const c = await prisma.competition.create({
      data: {
        name: "صغيرة",
        startsAt: new Date(Date.now() + 3 * 86_400_000),
        roundCount: 1,
        roundPeriodMinutes: 1440,
        roundWindowMinutes: 840,
        servedCount: 1,
        boards: { create: DEFAULT_BOARDS.map((b, order) => ({ ...b, order })) },
        ...DEFAULT_CURVE,
      },
    });
    await prisma.quizQuestion.create({
      data: {
        text: "س",
        category: "عام",
        bankId: "general",
        createdBy: "admin",
        answers: {
          create: [
            { text: "أ", isCorrect: true, order: 0 },
            { text: "ب", isCorrect: false, order: 1 },
          ],
        },
      },
    });

    const res = await START(post("/x", {}), withId(c.id));
    const body = await res.json();

    expect(res.status, JSON.stringify(body)).toBe(200);
    expect(body.competition.boards).toHaveLength(DEFAULT_BOARDS.length);
  });

  it("keeps the boards in their order so the editor lists them as they were", async () => {
    const c = await competition();
    const draft = await draftOf(c.id);

    const body = await (await SAVE(put("/x", draft), withId(c.id))).json();

    expect(body.competition.boards.map((b: { order: number }) => b.order)).toEqual(
      DEFAULT_BOARDS.map((_, i) => i),
    );
  });

  it("survives copy then edit then save, which is where this surfaced", async () => {
    const source = await competition("الصيف");
    const copied = (await (await COPY(post("/x", {}), withId(source.id))).json()).competition;
    const draft = await draftOf(copied.id);

    const body = await (
      await SAVE(put("/x", { ...draft, name: "الخريف" }), withId(copied.id))
    ).json();

    expect(body.competition.name).toBe("الخريف");
    expect(body.competition.boards).toHaveLength(DEFAULT_BOARDS.length);
  });
});
