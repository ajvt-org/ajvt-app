import { describe, it, expect, beforeEach } from "vitest";
import { POST } from "@/app/api/elections/[id]/vote/route";
import { GET as ONE } from "@/app/api/elections/[id]/route";
import { prisma } from "@/lib/prisma";
import { MEMBERSHIP_FEE } from "@/lib/donations";
import { resetDb, post, get, createUser, signInAs, makeMember, withId } from "./helpers";

const HOUR = 3600_000;
const DAY = 24 * HOUR;

function anElection(over: Record<string, unknown> = {}) {
  return prisma.election.create({
    data: {
      title: "انتخاب اللجنة",
      hidden: false,
      startsAt: new Date(Date.now() - HOUR),
      durationMinutes: 600,
      ...over,
    },
  });
}

async function withCandidates(over: Record<string, unknown> = {}) {
  const election = await anElection(over);
  await prisma.electionCandidate.createMany({
    data: [
      { electionId: election.id, fullName: "الأول", order: 0 },
      { electionId: election.id, fullName: "الثاني", order: 1 },
      { electionId: election.id, fullName: "الثالث", order: 2 },
    ],
  });
  const candidates = await prisma.electionCandidate.findMany({
    where: { electionId: election.id },
    orderBy: { order: "asc" },
  });
  return { election, candidates };
}

async function paidMember(fullName = "عضو") {
  const user = await createUser(`2${String(Math.random()).slice(2, 9)}`);
  await makeMember({
    userId: user.id,
    fullName,
    age: "البدريين",
    paymentMethod: "بنكيلي",
    status: "ACTIVE",
    paidAmount: MEMBERSHIP_FEE,
  });
  return user;
}

function vote(electionId: string, body: unknown) {
  return POST(post(`/api/elections/${electionId}/vote`, body), withId(electionId));
}

describe("who may cast a ballot", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("refuses an anonymous caller", async () => {
    const { election, candidates } = await withCandidates();

    const res = await vote(election.id, { candidateId: candidates[0].id });

    expect(res.status).toBe(401);
    expect(await prisma.electionBallot.count()).toBe(0);
  });

  it("refuses a signed in account that is not paid up", async () => {
    const { election, candidates } = await withCandidates();
    await signInAs(await createUser("22440011"));

    const res = await vote(election.id, { candidateId: candidates[0].id });

    expect(res.status).toBe(403);
    expect(await prisma.electionBallot.count()).toBe(0);
  });

  it("takes the ballot of a paid up member", async () => {
    const { election, candidates } = await withCandidates();
    const user = await paidMember();
    await signInAs(user);

    const res = await vote(election.id, { candidateId: candidates[1].id });

    expect(res.status).toBe(201);
    const ballot = await prisma.electionBallot.findFirstOrThrow();
    expect(ballot.userId).toBe(user.id);
    expect(ballot.candidateId).toBe(candidates[1].id);
  });
});

describe("the window, which is the only authority", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("refuses a ballot before the window opens", async () => {
    const { election, candidates } = await withCandidates({
      startsAt: new Date(Date.now() + DAY),
    });
    await signInAs(await paidMember());

    const res = await vote(election.id, { candidateId: candidates[0].id });

    expect(res.status).toBe(409);
    expect(await prisma.electionBallot.count()).toBe(0);
  });

  it("refuses a ballot after the window closes", async () => {
    const { election, candidates } = await withCandidates({
      startsAt: new Date(Date.now() - 10 * HOUR),
      durationMinutes: 60,
    });
    await signInAs(await paidMember());

    const res = await vote(election.id, { candidateId: candidates[0].id });

    expect(res.status).toBe(409);
    expect(await prisma.electionBallot.count()).toBe(0);
  });

  it("refuses a ballot in an election no member can see", async () => {
    const { election, candidates } = await withCandidates({ hidden: true });
    await signInAs(await paidMember());

    const res = await vote(election.id, { candidateId: candidates[0].id });

    expect(res.status).toBe(404);
    expect(await prisma.electionBallot.count()).toBe(0);
  });
});

describe("what a ballot may name", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("refuses a candidate of another election", async () => {
    const { election } = await withCandidates();
    const other = await withCandidates({ title: "انتخاب آخر" });
    await signInAs(await paidMember());

    const res = await vote(election.id, { candidateId: other.candidates[0].id });

    expect(res.status).toBe(400);
    expect(await prisma.electionBallot.count()).toBe(0);
  });

  it("refuses a candidate that does not exist", async () => {
    const { election } = await withCandidates();
    await signInAs(await paidMember());

    const res = await vote(election.id, { candidateId: "nobody" });

    expect(res.status).toBe(400);
  });

  it("refuses a blank where the election does not allow one", async () => {
    const { election } = await withCandidates({ allowBlank: false });
    await signInAs(await paidMember());

    const res = await vote(election.id, { candidateId: null });

    expect(res.status).toBe(400);
    expect(await prisma.electionBallot.count()).toBe(0);
  });

  it("takes a blank where the election allows one, and counts it as cast", async () => {
    const { election } = await withCandidates({ allowBlank: true });
    await signInAs(await paidMember());

    const res = await vote(election.id, { candidateId: null });

    expect(res.status).toBe(201);
    const ballot = await prisma.electionBallot.findFirstOrThrow();
    expect(ballot.candidateId).toBeNull();
  });

  it("refuses a body that names nothing at all", async () => {
    const { election } = await withCandidates();
    await signInAs(await paidMember());

    const res = await vote(election.id, {});

    expect(res.status).toBe(400);
  });
});

describe("one ballot each", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("refuses the second ballot from the same account", async () => {
    const { election, candidates } = await withCandidates();
    await signInAs(await paidMember());

    expect((await vote(election.id, { candidateId: candidates[0].id })).status).toBe(201);
    const again = await vote(election.id, { candidateId: candidates[1].id });

    expect(again.status).toBe(409);
    expect(await prisma.electionBallot.count()).toBe(1);
  });

  it("loses neither of two ballots arriving at once", async () => {
    const { election, candidates } = await withCandidates();
    await signInAs(await paidMember());

    const both = await Promise.all([
      vote(election.id, { candidateId: candidates[0].id }),
      vote(election.id, { candidateId: candidates[1].id }),
    ]);

    expect(both.map((res) => res.status).sort()).toEqual([201, 409]);
    expect(await prisma.electionBallot.count()).toBe(1);
  });

  it("lets a member vote in a second election, since the key is per election", async () => {
    const here = await withCandidates({ title: "الأول" });
    const there = await withCandidates({ title: "الثاني" });
    await signInAs(await paidMember());

    expect((await vote(here.election.id, { candidateId: here.candidates[0].id })).status).toBe(201);
    expect((await vote(there.election.id, { candidateId: there.candidates[0].id })).status).toBe(
      201,
    );
    expect(await prisma.electionBallot.count()).toBe(2);
  });

  it("lets a second member vote in the same election", async () => {
    const { election, candidates } = await withCandidates();
    await signInAs(await paidMember("الأول"));
    await vote(election.id, { candidateId: candidates[0].id });
    await signInAs(await paidMember("الثاني"));

    expect((await vote(election.id, { candidateId: candidates[0].id })).status).toBe(201);
    expect(await prisma.electionBallot.count()).toBe(2);
  });
});

describe("what comes back", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("says it worked and carries no tally", async () => {
    const { election, candidates } = await withCandidates();
    await signInAs(await paidMember());

    const body = await (await vote(election.id, { candidateId: candidates[0].id })).json();

    expect(body).toEqual({ voted: true });
  });

  it("reads the voter their own choice back afterwards", async () => {
    const { election, candidates } = await withCandidates();
    await signInAs(await paidMember());
    await vote(election.id, { candidateId: candidates[2].id });

    const body = await (
      await ONE(get(`/api/elections/${election.id}`), withId(election.id))
    ).json();

    expect(body.voted).toBe(true);
    expect(body.myCandidateId).toBe(candidates[2].id);
  });

  it("reads a blank back as a blank rather than as nothing cast", async () => {
    const { election } = await withCandidates({ allowBlank: true });
    await signInAs(await paidMember());
    await vote(election.id, { candidateId: null });

    const body = await (
      await ONE(get(`/api/elections/${election.id}`), withId(election.id))
    ).json();

    expect(body.voted).toBe(true);
    expect(body.myCandidateId).toBeNull();
  });

  it("tells one member nothing about another member's ballot", async () => {
    const { election, candidates } = await withCandidates();
    const other = await paidMember("آخر");
    await signInAs(other);
    await vote(election.id, { candidateId: candidates[0].id });
    await signInAs(await paidMember("أنا"));

    const res = await ONE(get(`/api/elections/${election.id}`), withId(election.id));
    const text = await res.text();

    expect(text).not.toContain(other.id);
    expect(JSON.parse(text).voted).toBe(false);
  });
});

describe("the order the candidates arrive in", () => {
  beforeEach(async () => {
    await resetDb();
  });

  const namesFrom = async (electionId: string) => {
    const body = await (await ONE(get(`/api/elections/${electionId}`), withId(electionId))).json();
    return body.election.candidates.map((one: { fullName: string }) => one.fullName);
  };

  it("follows the admin order when the toggle is off", async () => {
    const { election } = await withCandidates({ shuffleCandidates: false });
    await signInAs(await paidMember());

    expect(await namesFrom(election.id)).toEqual(["الأول", "الثاني", "الثالث"]);
  });

  it("gives a voter the same order twice", async () => {
    const { election } = await withCandidates({ shuffleCandidates: true });
    await signInAs(await paidMember());

    expect(await namesFrom(election.id)).toEqual(await namesFrom(election.id));
  });

  it("gives a visitor the admin order, since nobody votes from that page", async () => {
    const { election } = await withCandidates({ shuffleCandidates: true });

    expect(await namesFrom(election.id)).toEqual(["الأول", "الثاني", "الثالث"]);
  });
});
