import { describe, it, expect, beforeEach } from "vitest";
import { DELETE } from "@/app/api/admin/elections/[id]/route";
import { GET as LIST } from "@/app/api/admin/deleted/route";
import { POST as RESTORE } from "@/app/api/admin/deleted/[id]/restore/route";
import { prisma } from "@/lib/prisma";
import { resetDb, post, del, get, createAdmin, signInAsAdmin, withId } from "./helpers";

const HOUR = 3600_000;
const TITLE = "انتخاب اللجنة";

function anElection(over: Record<string, unknown> = {}) {
  return prisma.election.create({
    data: {
      title: TITLE,
      hidden: false,
      startsAt: new Date(Date.now() - 3 * HOUR),
      durationMinutes: 60,
      ...over,
    },
  });
}

async function voted(electionId: string) {
  const candidate = await prisma.electionCandidate.create({
    data: { electionId, fullName: "المترشح الأول" },
  });
  const voter = await prisma.user.create({ data: { fullName: "ناخب" } });
  const blank = await prisma.user.create({ data: { fullName: "ناخب آخر" } });
  await prisma.electionBallot.create({
    data: { electionId, userId: voter.id, candidateId: candidate.id },
  });
  await prisma.electionBallot.create({ data: { electionId, userId: blank.id } });
  return { candidate, voter, blank };
}

function remove(id: string, confirmTitle?: string) {
  const body = confirmTitle === undefined ? undefined : { confirmTitle };
  return DELETE(del(`/api/admin/elections/${id}`, body), withId(id));
}

describe("DELETE /api/admin/elections/[id]", () => {
  beforeEach(async () => {
    await resetDb();
    await signInAsAdmin(await createAdmin());
  });

  it("removes a hidden election nobody has voted in", async () => {
    const election = await anElection({ hidden: true, startsAt: new Date(Date.now() + HOUR) });

    expect((await remove(election.id)).status).toBe(200);
    expect(await prisma.election.count()).toBe(0);
  });

  it("removes a published election that members voted in, ballots first", async () => {
    const election = await anElection();
    await voted(election.id);

    expect((await remove(election.id)).status).toBe(200);
    expect(await prisma.election.count()).toBe(0);
    expect(await prisma.electionCandidate.count()).toBe(0);
    expect(await prisma.electionBallot.count()).toBe(0);
  });

  it("keeps the election, its candidates and its ballots in the archive", async () => {
    const election = await anElection();
    await voted(election.id);

    await remove(election.id);

    const record = await prisma.deletedRecord.findFirstOrThrow();
    const data = record.data as { candidates: unknown[]; ballots: unknown[] };
    expect(record.kind).toBe("Election");
    expect(record.label).toBe(TITLE);
    expect(record.deletedBy).toBe("admin");
    expect(data.candidates).toHaveLength(1);
    expect(data.ballots).toHaveLength(2);
  });

  it("asks for the title before removing an election that is still open", async () => {
    const election = await anElection({ startsAt: new Date(Date.now() - HOUR / 2) });

    expect((await remove(election.id)).status).toBe(400);
    expect((await remove(election.id, "عنوان آخر")).status).toBe(400);
    expect(await prisma.election.count()).toBe(1);

    expect((await remove(election.id, ` ${TITLE} `)).status).toBe(200);
    expect(await prisma.election.count()).toBe(0);
  });

  it("writes the deletion to the audit log", async () => {
    const election = await anElection();

    await remove(election.id);

    const entry = await prisma.auditLog.findFirstOrThrow();
    expect(entry.action).toBe("DELETE_ELECTION");
    expect(entry.targetType).toBe("Election");
  });

  it("answers 404 for an election that is not there", async () => {
    expect((await remove("nope")).status).toBe(404);
  });

  it("refuses a members admin", async () => {
    const election = await anElection();
    await signInAsAdmin(await createAdmin("nurse", "MEMBERS"));

    expect((await remove(election.id)).status).toBe(403);
    expect(await prisma.election.count()).toBe(1);
  });
});

describe("restoring a deleted election", () => {
  beforeEach(async () => {
    await resetDb();
    await signInAsAdmin(await createAdmin());
  });

  async function archived() {
    const election = await anElection({ allowBlank: true });
    const people = await voted(election.id);
    await remove(election.id);
    const record = await prisma.deletedRecord.findFirstOrThrow();
    return { election, record, ...people };
  }

  function restore(id: string) {
    return RESTORE(post(`/api/admin/deleted/${id}/restore`, {}), withId(id));
  }

  it("brings the election back with its candidates and ballots", async () => {
    const { election, record, candidate, voter, blank } = await archived();

    expect((await restore(record.id)).status).toBe(200);

    const back = await prisma.election.findUniqueOrThrow({ where: { id: election.id } });
    expect(back.title).toBe(TITLE);
    expect(back.allowBlank).toBe(true);
    expect(back.startsAt.getTime()).toBe(election.startsAt.getTime());
    expect(await prisma.electionCandidate.count({ where: { id: candidate.id } })).toBe(1);
    const ballots = await prisma.electionBallot.findMany();
    expect(ballots).toHaveLength(2);
    expect(ballots).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ userId: voter.id, candidateId: candidate.id }),
        expect.objectContaining({ userId: blank.id, candidateId: null }),
      ]),
    );
    expect(await prisma.deletedRecord.count()).toBe(0);
  });

  it("drops the ballot of an account deleted in the meantime", async () => {
    const { record, blank } = await archived();
    await prisma.user.delete({ where: { id: blank.id } });

    expect((await restore(record.id)).status).toBe(200);
    expect(await prisma.electionBallot.count()).toBe(1);
  });

  it("writes the restore to the audit log", async () => {
    const { record } = await archived();

    await restore(record.id);

    const entry = await prisma.auditLog.findFirstOrThrow({ where: { action: "RESTORE_ELECTION" } });
    expect(entry.targetType).toBe("Election");
  });

  it("keeps a deleted election away from a members admin", async () => {
    const { record } = await archived();
    await signInAsAdmin(await createAdmin("nurse", "MEMBERS"));

    const listed = await (await LIST(get("/api/admin/deleted"))).json();
    expect(listed.records).toEqual([]);
    expect((await restore(record.id)).status).toBe(403);
    expect(await prisma.election.count()).toBe(0);
  });
});
