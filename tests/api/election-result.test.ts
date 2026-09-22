import { describe, it, expect, beforeEach } from "vitest";
import { GET as ONE } from "@/app/api/elections/[id]/route";
import { prisma } from "@/lib/prisma";
import { MEMBERSHIP_FEE } from "@/lib/donations";
import { resetDb, get, createUser, signInAs, makeMember, withId } from "./helpers";

const HOUR = 3600_000;

async function paidMember(fullName: string) {
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

async function anElection(over: Record<string, unknown> = {}) {
  const election = await prisma.election.create({
    data: {
      title: "انتخاب اللجنة",
      hidden: false,
      startsAt: new Date(Date.now() - 10 * HOUR),
      durationMinutes: 60,
      allowBlank: true,
      ...over,
    },
  });
  await prisma.electionCandidate.createMany({
    data: [
      { electionId: election.id, fullName: "الأول", order: 0 },
      { electionId: election.id, fullName: "الثاني", order: 1 },
    ],
  });
  return election;
}

async function ballots(electionId: string, counts: [number, number, number]) {
  const candidates = await prisma.electionCandidate.findMany({
    where: { electionId },
    orderBy: { order: "asc" },
  });
  const spread = [
    ...Array(counts[0]).fill(candidates[0].id),
    ...Array(counts[1]).fill(candidates[1].id),
    ...Array(counts[2]).fill(null),
  ];
  for (const [index, candidateId] of spread.entries()) {
    const voter = await paidMember(`ناخب ${index}`);
    await prisma.electionBallot.create({ data: { electionId, userId: voter.id, candidateId } });
  }
}

const read = async (id: string) =>
  (await (await ONE(get(`/api/elections/${id}`), withId(id))).json()) as {
    result: { electorate: number; cast: number; blank: number; rows: { votes: number }[] } | null;
  };

describe("the result a member reads", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("carries nothing while the window is still open", async () => {
    const election = await anElection({
      startsAt: new Date(Date.now() - HOUR),
      durationMinutes: 600,
    });
    await ballots(election.id, [2, 1, 0]);

    expect((await read(election.id)).result).toBeNull();
  });

  it("carries nothing while the election has not started", async () => {
    const election = await anElection({ startsAt: new Date(Date.now() + HOUR) });

    expect((await read(election.id)).result).toBeNull();
  });

  it("carries nothing once it is over while the committee holds it back", async () => {
    const election = await anElection({ showResults: false });
    await ballots(election.id, [2, 1, 0]);

    expect((await read(election.id)).result).toBeNull();
  });

  it("carries the count once it is over and the committee has published", async () => {
    const election = await anElection({ showResults: true });
    await ballots(election.id, [3, 1, 2]);

    const { result } = await read(election.id);

    expect(result?.cast).toBe(6);
    expect(result?.blank).toBe(2);
    expect(result?.rows.map((row) => row.votes)).toEqual([3, 1]);
  });

  it("reads to a visitor exactly as it reads to a member", async () => {
    const election = await anElection({ showResults: true });
    await ballots(election.id, [3, 1, 2]);
    const reader = await paidMember("قارئ");
    const asVisitor = await read(election.id);

    await signInAs(reader);
    const asMember = await read(election.id);

    expect(asMember.result).toEqual(asVisitor.result);
  });

  it("counts the electorate rather than listing it", async () => {
    const election = await anElection({ showResults: true });
    await ballots(election.id, [1, 0, 0]);
    await paidMember("لم يصوت");

    const res = await ONE(get(`/api/elections/${election.id}`), withId(election.id));
    const text = await res.text();

    expect(JSON.parse(text).result.electorate).toBe(2);
    expect(text).not.toContain("لم يصوت");
  });

  it("names no voter in the published result", async () => {
    const election = await anElection({ showResults: true });
    const voter = await paidMember("ناخب معروف");
    await prisma.electionBallot.create({ data: { electionId: election.id, userId: voter.id } });

    const text = await (
      await ONE(get(`/api/elections/${election.id}`), withId(election.id))
    ).text();

    expect(text).not.toContain(voter.id);
    expect(text).not.toContain("ناخب معروف");
  });
});
