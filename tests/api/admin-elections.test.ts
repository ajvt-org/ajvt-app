import { describe, it, expect, beforeEach } from "vitest";
import { GET, POST } from "@/app/api/admin/elections/route";
import { GET as READ, PATCH, DELETE } from "@/app/api/admin/elections/[id]/route";
import { prisma } from "@/lib/prisma";
import { OWNER_ROLE, SUPER_ROLE } from "@/lib/adminRoles";
import { resetDb, post, patch, del, get, createAdmin, signInAsAdmin, withId } from "./helpers";

const HOUR = 3600_000;

const newElection = {
  title: "انتخاب رئيس الجمعية",
  startsAt: new Date(Date.now() + 24 * HOUR).toISOString(),
  durationMinutes: 1440,
};

function anElection(over: Record<string, unknown> = {}) {
  return prisma.election.create({
    data: {
      title: "انتخاب اللجنة",
      startsAt: new Date(Date.now() + 24 * HOUR),
      durationMinutes: 120,
      ...over,
    },
  });
}

describe("who reaches the election routes", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("refuses an anonymous caller", async () => {
    const res = await POST(post("/api/admin/elections", newElection));

    expect(res.status).toBe(401);
    expect(await prisma.election.count()).toBe(0);
  });

  it("refuses a quiz admin, whose tab this is not", async () => {
    await signInAsAdmin(await createAdmin("quizzer", "QUIZ"));

    const res = await POST(post("/api/admin/elections", newElection));

    expect(res.status).toBe(403);
    expect(await prisma.election.count()).toBe(0);
  });

  it("refuses a members admin on the read as well as the write", async () => {
    await signInAsAdmin(await createAdmin("nurse", "MEMBERS"));

    expect((await GET(get("/api/admin/elections"))).status).toBe(403);
    expect((await POST(post("/api/admin/elections", newElection))).status).toBe(403);
  });

  it("lets the roles that reach every screen through", async () => {
    for (const role of [SUPER_ROLE, OWNER_ROLE]) {
      await resetDb();
      await signInAsAdmin(await createAdmin(`boss-${role}`, role));

      expect((await POST(post("/api/admin/elections", newElection))).status).toBe(201);
    }
  });
});

describe("POST /api/admin/elections", () => {
  beforeEach(async () => {
    await resetDb();
    await signInAsAdmin(await createAdmin());
  });

  it("creates an election hidden, so nothing under construction reaches a member", async () => {
    const res = await POST(post("/api/admin/elections", newElection));
    const { election } = await res.json();

    expect(res.status).toBe(201);
    expect(election.hidden).toBe(true);
    expect(election.title).toBe(newElection.title);
  });

  it("logs the creation", async () => {
    await POST(post("/api/admin/elections", newElection));

    const entry = await prisma.auditLog.findFirstOrThrow();
    expect(entry.action).toBe("CREATE_ELECTION");
    expect(entry.targetLabel).toBe(newElection.title);
  });

  it("refuses an empty title", async () => {
    const res = await POST(post("/api/admin/elections", { ...newElection, title: "   " }));

    expect(res.status).toBe(400);
    expect(await prisma.election.count()).toBe(0);
  });

  it("refuses a duration outside the floor and the ceiling", async () => {
    for (const durationMinutes of [0, 10081]) {
      const res = await POST(post("/api/admin/elections", { ...newElection, durationMinutes }));
      expect(res.status).toBe(400);
    }
    expect(await prisma.election.count()).toBe(0);
  });

  it("refuses a start that has already passed", async () => {
    const startsAt = new Date(Date.now() - HOUR).toISOString();

    const res = await POST(post("/api/admin/elections", { ...newElection, startsAt }));

    expect(res.status).toBe(400);
    expect(await prisma.election.count()).toBe(0);
  });

  it("lists the newest election first", async () => {
    await POST(post("/api/admin/elections", { ...newElection, title: "الأول" }));
    await POST(post("/api/admin/elections", { ...newElection, title: "الثاني" }));

    const { elections } = await (await GET(get("/api/admin/elections"))).json();

    expect(elections.map((one: { title: string }) => one.title)).toEqual(["الثاني", "الأول"]);
  });
});

describe("PATCH /api/admin/elections/[id]", () => {
  beforeEach(async () => {
    await resetDb();
    await signInAsAdmin(await createAdmin());
  });

  it("changes anything while the vote has not opened", async () => {
    const election = await anElection();

    const res = await PATCH(
      patch(`/api/admin/elections/${election.id}`, {
        title: "اسم آخر",
        durationMinutes: 720,
        allowBlank: true,
        hidden: false,
      }),
      withId(election.id),
    );

    expect(res.status).toBe(200);
    const after = await prisma.election.findUniqueOrThrow({ where: { id: election.id } });
    expect(after.title).toBe("اسم آخر");
    expect(after.durationMinutes).toBe(720);
    expect(after.allowBlank).toBe(true);
    expect(after.hidden).toBe(false);
  });

  it("logs the publication rather than a bare update", async () => {
    const election = await anElection();

    await PATCH(
      patch(`/api/admin/elections/${election.id}`, { hidden: false }),
      withId(election.id),
    );

    const entry = await prisma.auditLog.findFirstOrThrow();
    expect(entry.action).toBe("PUBLISH_ELECTION");
  });

  it("refuses the title, the clock and the ballot toggles once the vote has opened", async () => {
    const election = await anElection({ startsAt: new Date(Date.now() - HOUR), hidden: false });

    for (const body of [
      { title: "اسم آخر" },
      { startsAt: new Date(Date.now() + HOUR).toISOString() },
      { durationMinutes: 60 },
      { allowBlank: true },
      { shuffleCandidates: true },
    ]) {
      const res = await PATCH(
        patch(`/api/admin/elections/${election.id}`, body),
        withId(election.id),
      );
      expect(res.status).toBe(409);
    }

    const after = await prisma.election.findUniqueOrThrow({ where: { id: election.id } });
    expect(after.title).toBe(election.title);
    expect(after.startsAt.getTime()).toBe(election.startsAt.getTime());
    expect(after.durationMinutes).toBe(election.durationMinutes);
    expect(after.allowBlank).toBe(false);
  });

  it("refuses the same fields once the vote has closed", async () => {
    const election = await anElection({
      startsAt: new Date(Date.now() - 10 * HOUR),
      durationMinutes: 60,
      hidden: false,
    });

    const res = await PATCH(
      patch(`/api/admin/elections/${election.id}`, { title: "اسم آخر" }),
      withId(election.id),
    );

    expect(res.status).toBe(409);
  });

  it("refuses to hide an election once the vote has opened", async () => {
    const election = await anElection({ startsAt: new Date(Date.now() - HOUR), hidden: false });

    const res = await PATCH(
      patch(`/api/admin/elections/${election.id}`, { hidden: true }),
      withId(election.id),
    );

    expect(res.status).toBe(409);
    const after = await prisma.election.findUniqueOrThrow({ where: { id: election.id } });
    expect(after.hidden).toBe(false);
  });

  it("keeps the result toggle writable while the vote runs", async () => {
    const election = await anElection({ startsAt: new Date(Date.now() - HOUR), hidden: false });

    const res = await PATCH(
      patch(`/api/admin/elections/${election.id}`, { showResults: false }),
      withId(election.id),
    );

    expect(res.status).toBe(200);
    const after = await prisma.election.findUniqueOrThrow({ where: { id: election.id } });
    expect(after.showResults).toBe(false);
  });

  it("keeps the result toggle writable after the vote has closed", async () => {
    const election = await anElection({
      startsAt: new Date(Date.now() - 10 * HOUR),
      durationMinutes: 60,
      hidden: false,
      showResults: false,
    });

    const res = await PATCH(
      patch(`/api/admin/elections/${election.id}`, { showResults: true }),
      withId(election.id),
    );

    expect(res.status).toBe(200);
    const entry = await prisma.auditLog.findFirstOrThrow();
    expect(entry.action).toBe("SHOW_ELECTION_RESULTS");
  });

  it("answers 404 for an election that is not there", async () => {
    const res = await PATCH(
      patch("/api/admin/elections/nope", { showResults: true }),
      withId("nope"),
    );

    expect(res.status).toBe(404);
  });
});

describe("DELETE /api/admin/elections/[id]", () => {
  beforeEach(async () => {
    await resetDb();
    await signInAsAdmin(await createAdmin());
  });

  it("throws away a hidden election nobody has voted in", async () => {
    const election = await anElection();

    const res = await DELETE(del(`/api/admin/elections/${election.id}`), withId(election.id));

    expect(res.status).toBe(200);
    expect(await prisma.election.count()).toBe(0);
  });

  it("refuses an election the members can already see", async () => {
    const election = await anElection({ hidden: false });

    const res = await DELETE(del(`/api/admin/elections/${election.id}`), withId(election.id));

    expect(res.status).toBe(409);
    expect(await prisma.election.count()).toBe(1);
  });

  it("refuses an election somebody has voted in", async () => {
    const election = await anElection();
    const user = await prisma.user.create({ data: { fullName: "ناخب" } });
    await prisma.electionBallot.create({ data: { electionId: election.id, userId: user.id } });

    const res = await DELETE(del(`/api/admin/elections/${election.id}`), withId(election.id));

    expect(res.status).toBe(409);
    expect(await prisma.election.count()).toBe(1);
  });
});

describe("GET /api/admin/elections/[id]", () => {
  beforeEach(async () => {
    await resetDb();
    await signInAsAdmin(await createAdmin());
  });

  it("serves one election with its candidates", async () => {
    const election = await anElection();

    const res = await READ(get(`/api/admin/elections/${election.id}`), withId(election.id));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.election.id).toBe(election.id);
    expect(body.election.candidates).toEqual([]);
  });
});
