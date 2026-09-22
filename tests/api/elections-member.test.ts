import { describe, it, expect, beforeEach } from "vitest";
import { GET as LIST } from "@/app/api/elections/route";
import { GET as ONE } from "@/app/api/elections/[id]/route";
import { prisma } from "@/lib/prisma";
import { MEMBERSHIP_FEE } from "@/lib/donations";
import { resetDb, get, createUser, signInAs, makeMember, withId } from "./helpers";

const HOUR = 3600_000;
const DAY = 24 * HOUR;

function anElection(over: Record<string, unknown> = {}) {
  return prisma.election.create({
    data: {
      title: "انتخاب اللجنة",
      hidden: false,
      startsAt: new Date(Date.now() + DAY),
      durationMinutes: 120,
      ...over,
    },
  });
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

const listed = async () =>
  (await (await LIST(get("/api/elections"))).json()) as {
    elections: { id: string; title: string; voted: boolean }[];
    signedIn: boolean;
    canVote: boolean;
  };

describe("the elections a member can see", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("leaves out an election still being prepared", async () => {
    await anElection({ hidden: true });

    expect((await listed()).elections).toEqual([]);
  });

  it("answers 404 on a direct id for a hidden election, so a guess says nothing", async () => {
    const election = await anElection({ hidden: true });

    const res = await ONE(get(`/api/elections/${election.id}`), withId(election.id));

    expect(res.status).toBe(404);
  });

  it("answers 404 for a hidden election to a signed in member too", async () => {
    const election = await anElection({ hidden: true });
    await signInAs(await paidMember());

    const res = await ONE(get(`/api/elections/${election.id}`), withId(election.id));

    expect(res.status).toBe(404);
  });

  it("drops a result nobody is still reading off the list", async () => {
    await anElection({ startsAt: new Date(Date.now() - 90 * DAY), durationMinutes: 60 });

    expect((await listed()).elections).toEqual([]);
  });

  it("orders what is open first, then what is coming, then what has ended", async () => {
    await anElection({
      title: "منته",
      startsAt: new Date(Date.now() - 5 * DAY),
      durationMinutes: 60,
    });
    await anElection({ title: "قادم", startsAt: new Date(Date.now() + DAY) });
    await anElection({
      title: "جار",
      startsAt: new Date(Date.now() - HOUR),
      durationMinutes: 600,
    });

    expect((await listed()).elections.map((one) => one.title)).toEqual(["جار", "قادم", "منته"]);
  });

  it("tells a visitor they cannot vote without saying why anybody else can", async () => {
    await anElection();

    const body = await listed();

    expect(body.signedIn).toBe(false);
    expect(body.canVote).toBe(false);
  });

  it("tells a paid up member they may vote", async () => {
    await anElection();
    await signInAs(await paidMember());

    const body = await listed();

    expect(body.signedIn).toBe(true);
    expect(body.canVote).toBe(true);
  });

  it("tells a signed in account that has not paid it may not", async () => {
    await anElection();
    const user = await createUser("22119900");
    await signInAs(user);

    const body = await listed();

    expect(body.signedIn).toBe(true);
    expect(body.canVote).toBe(false);
  });

  it("marks the election this reader has already voted in, and only that one", async () => {
    const voted = await anElection({ title: "صوّت فيه" });
    await anElection({ title: "لم يصوّت فيه" });
    const user = await paidMember();
    await prisma.electionBallot.create({ data: { electionId: voted.id, userId: user.id } });
    await signInAs(user);

    const body = await listed();

    expect(body.elections.filter((one) => one.voted).map((one) => one.title)).toEqual(["صوّت فيه"]);
  });

  it("marks nothing voted for somebody else's ballot", async () => {
    const election = await anElection();
    const other = await paidMember("آخر");
    await prisma.electionBallot.create({ data: { electionId: election.id, userId: other.id } });
    await signInAs(await paidMember("أنا"));

    expect((await listed()).elections.every((one) => !one.voted)).toBe(true);
  });
});

describe("one election a member opens", () => {
  beforeEach(async () => {
    await resetDb();
  });

  async function withCandidates(over: Record<string, unknown> = {}) {
    const election = await anElection(over);
    await prisma.electionCandidate.createMany({
      data: [
        { electionId: election.id, fullName: "الأول", order: 0 },
        { electionId: election.id, fullName: "الثاني", photo: "poster.webp", order: 1 },
      ],
    });
    return election;
  }

  it("shows the candidates before the window opens, so nobody is rushed", async () => {
    const election = await withCandidates();

    const res = await ONE(get(`/api/elections/${election.id}`), withId(election.id));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.election.candidates.map((one: { fullName: string }) => one.fullName)).toEqual([
      "الأول",
      "الثاني",
    ]);
  });

  it("carries no ballot of anybody else", async () => {
    const election = await withCandidates();
    const other = await paidMember("آخر");
    await prisma.electionBallot.create({ data: { electionId: election.id, userId: other.id } });

    const res = await ONE(get(`/api/elections/${election.id}`), withId(election.id));

    expect(await res.text()).not.toContain(other.id);
  });

  it("tells the reader whether they have voted and nothing about the count", async () => {
    const election = await withCandidates();
    const user = await paidMember();
    await prisma.electionBallot.create({ data: { electionId: election.id, userId: user.id } });
    await signInAs(user);

    const body = await (
      await ONE(get(`/api/elections/${election.id}`), withId(election.id))
    ).json();

    expect(body.voted).toBe(true);
    expect(body).not.toHaveProperty("tally");
  });

  it("answers 404 for an id that names nothing", async () => {
    const res = await ONE(get("/api/elections/nope"), withId("nope"));

    expect(res.status).toBe(404);
  });
});
