import { describe, it, expect, beforeEach } from "vitest";
import { POST } from "@/app/api/admin/elections/[id]/candidates/route";
import { PATCH, DELETE } from "@/app/api/admin/elections/[id]/candidates/[candidateId]/route";
import { prisma } from "@/lib/prisma";
import { resetDb, post, patch, del, createAdmin, signInAsAdmin, withParams } from "./helpers";

const HOUR = 3600_000;

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

function add(id: string, body: unknown) {
  return POST(post(`/api/admin/elections/${id}/candidates`, body), withParams({ id }));
}

function change(id: string, candidateId: string, body: unknown) {
  return PATCH(
    patch(`/api/admin/elections/${id}/candidates/${candidateId}`, body),
    withParams({ id, candidateId }),
  );
}

function drop(id: string, candidateId: string) {
  return DELETE(
    del(`/api/admin/elections/${id}/candidates/${candidateId}`),
    withParams({ id, candidateId }),
  );
}

describe("adding a candidate", () => {
  beforeEach(async () => {
    await resetDb();
    await signInAsAdmin(await createAdmin());
  });

  it("takes anybody, with no account behind the name", async () => {
    const election = await anElection();

    const res = await add(election.id, { fullName: "أحمد ولد محمد ولد سيدي", photo: null });
    const { candidate } = await res.json();

    expect(res.status).toBe(201);
    expect(candidate.fullName).toBe("أحمد ولد محمد ولد سيدي");
    expect(await prisma.user.count()).toBe(0);
  });

  it("keeps a photograph of its own rather than reaching for a member card", async () => {
    const election = await anElection();

    await add(election.id, { fullName: "مترشح", photo: "poster.webp" });

    const row = await prisma.electionCandidate.findFirstOrThrow();
    expect(row.photo).toBe("poster.webp");
  });

  it("numbers each new candidate after the last", async () => {
    const election = await anElection();

    await add(election.id, { fullName: "الأول" });
    await add(election.id, { fullName: "الثاني" });

    const rows = await prisma.electionCandidate.findMany({ orderBy: { order: "asc" } });
    expect(rows.map((row) => [row.fullName, row.order])).toEqual([
      ["الأول", 0],
      ["الثاني", 1],
    ]);
  });

  it("refuses an empty name", async () => {
    const election = await anElection();

    const res = await add(election.id, { fullName: "  " });

    expect(res.status).toBe(400);
    expect(await prisma.electionCandidate.count()).toBe(0);
  });

  it("refuses a quiz admin", async () => {
    const election = await anElection();
    await signInAsAdmin(await createAdmin("quizzer", "QUIZ"));

    const res = await add(election.id, { fullName: "مترشح" });

    expect(res.status).toBe(403);
    expect(await prisma.electionCandidate.count()).toBe(0);
  });

  it("refuses once the vote has opened", async () => {
    const election = await anElection({ startsAt: new Date(Date.now() - HOUR), hidden: false });

    const res = await add(election.id, { fullName: "متأخر" });

    expect(res.status).toBe(409);
    expect(await prisma.electionCandidate.count()).toBe(0);
  });

  it("logs the addition", async () => {
    const election = await anElection();

    await add(election.id, { fullName: "مترشح" });

    const entry = await prisma.auditLog.findFirstOrThrow();
    expect(entry.action).toBe("ADD_ELECTION_CANDIDATE");
  });
});

describe("changing and removing a candidate", () => {
  beforeEach(async () => {
    await resetDb();
    await signInAsAdmin(await createAdmin());
  });

  async function withCandidate(over: Record<string, unknown> = {}) {
    const election = await anElection(over);
    const candidate = await prisma.electionCandidate.create({
      data: { electionId: election.id, fullName: "مترشح", photo: "old.webp" },
    });
    return { election, candidate };
  }

  it("renames a candidate and swaps the photograph", async () => {
    const { election, candidate } = await withCandidate();

    const res = await change(election.id, candidate.id, {
      fullName: "الاسم الجديد",
      photo: "new.webp",
    });

    expect(res.status).toBe(200);
    const after = await prisma.electionCandidate.findUniqueOrThrow({ where: { id: candidate.id } });
    expect(after.fullName).toBe("الاسم الجديد");
    expect(after.photo).toBe("new.webp");
  });

  it("clears a photograph when asked for none", async () => {
    const { election, candidate } = await withCandidate();

    await change(election.id, candidate.id, { photo: null });

    const after = await prisma.electionCandidate.findUniqueOrThrow({ where: { id: candidate.id } });
    expect(after.photo).toBeNull();
  });

  it("refuses a change once the vote has opened", async () => {
    const { election, candidate } = await withCandidate({
      startsAt: new Date(Date.now() - HOUR),
      hidden: false,
    });

    const res = await change(election.id, candidate.id, { fullName: "آخر" });

    expect(res.status).toBe(409);
  });

  it("refuses a candidate of another election", async () => {
    const { candidate } = await withCandidate();
    const other = await anElection({ title: "انتخاب آخر" });

    const res = await change(other.id, candidate.id, { fullName: "آخر" });

    expect(res.status).toBe(404);
  });

  it("removes a candidate nobody has voted for", async () => {
    const { election, candidate } = await withCandidate();

    const res = await drop(election.id, candidate.id);

    expect(res.status).toBe(200);
    expect(await prisma.electionCandidate.count()).toBe(0);
  });

  it("refuses to remove a candidate a ballot names", async () => {
    const { election, candidate } = await withCandidate();
    const voter = await prisma.user.create({ data: { fullName: "ناخب" } });
    await prisma.electionBallot.create({
      data: { electionId: election.id, userId: voter.id, candidateId: candidate.id },
    });

    const res = await drop(election.id, candidate.id);

    expect(res.status).toBe(409);
    expect(await prisma.electionCandidate.count()).toBe(1);
  });
});
