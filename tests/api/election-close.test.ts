import { describe, it, expect, beforeEach } from "vitest";
import { PUT } from "@/app/api/admin/elections/[id]/close/route";
import { POST as VOTE } from "@/app/api/elections/[id]/vote/route";
import { GET as ONE } from "@/app/api/elections/[id]/route";
import { prisma } from "@/lib/prisma";
import { OWNER_ROLE } from "@/lib/adminRoles";
import { MEMBERSHIP_FEE } from "@/lib/donations";
import {
  resetDb,
  put,
  post,
  get,
  createAdmin,
  signInAsAdmin,
  createUser,
  makeMember,
  signInAs,
  withId,
} from "./helpers";

const HOUR = 3600_000;
const DAY = 24 * HOUR;

function anElection(over: Record<string, unknown> = {}) {
  return prisma.election.create({
    data: {
      title: "انتخاب اللجنة",
      hidden: false,
      startsAt: new Date(Date.now() - HOUR / 2),
      durationMinutes: 60,
      ...over,
    },
  });
}

function move(id: string, closesAt: Date | string) {
  const value = typeof closesAt === "string" ? closesAt : closesAt.toISOString();
  return PUT(put(`/api/admin/elections/${id}/close`, { closesAt: value }), withId(id));
}

async function asOwner() {
  await signInAsAdmin(await createAdmin("owner", OWNER_ROLE));
}

async function paidMember() {
  const user = await createUser(`2${String(Math.random()).slice(2, 9)}`);
  await makeMember({
    userId: user.id,
    fullName: "عضو",
    age: "البدريين",
    paymentMethod: "بنكيلي",
    status: "ACTIVE",
    paidAmount: MEMBERSHIP_FEE,
  });
  return user;
}

describe("who moves the close of an election", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("refuses an admin with every screen who is not the owner", async () => {
    const election = await anElection();
    await signInAsAdmin(await createAdmin("super", "SUPER"));

    expect((await move(election.id, new Date(Date.now() + DAY))).status).toBe(403);
    expect((await prisma.election.findUniqueOrThrow({ where: { id: election.id } })).closesAt).toBe(
      null,
    );
  });

  it("refuses an anonymous caller", async () => {
    const election = await anElection();

    expect((await move(election.id, new Date(Date.now() + DAY))).status).toBe(401);
  });
});

describe("PUT /api/admin/elections/[id]/close", () => {
  beforeEach(async () => {
    await resetDb();
    await asOwner();
  });

  it("lets the owner run an open vote longer", async () => {
    const election = await anElection();
    const later = new Date(Date.now() + DAY);

    const res = await move(election.id, later);

    expect(res.status).toBe(200);
    const saved = await prisma.election.findUniqueOrThrow({ where: { id: election.id } });
    expect(saved.closesAt?.getTime()).toBe(later.getTime());
    expect(saved.durationMinutes).toBe(60);
  });

  it("reopens a vote that ended days ago without touching its announced length", async () => {
    const election = await anElection({ startsAt: new Date(Date.now() - 3 * DAY) });

    expect((await move(election.id, new Date(Date.now() + HOUR))).status).toBe(200);
    const saved = await prisma.election.findUniqueOrThrow({ where: { id: election.id } });
    expect(saved.durationMinutes).toBe(60);
  });

  it("never pulls the close inward", async () => {
    const election = await anElection({ closesAt: new Date(Date.now() + DAY) });

    const res = await move(election.id, new Date(Date.now() + HOUR));

    expect(res.status).toBe(409);
  });

  it("refuses a close that is already past", async () => {
    const election = await anElection({ startsAt: new Date(Date.now() - 3 * DAY) });

    expect((await move(election.id, new Date(Date.now() - DAY))).status).toBe(409);
  });

  it("leaves a vote that has not started to its settings", async () => {
    const election = await anElection({ startsAt: new Date(Date.now() + DAY) });

    expect((await move(election.id, new Date(Date.now() + 3 * DAY))).status).toBe(409);
  });

  it("refuses a moment it cannot read", async () => {
    const election = await anElection();

    expect((await move(election.id, "nonsense")).status).toBe(400);
  });

  it("answers 404 for an election that is not there", async () => {
    expect((await move("nope", new Date(Date.now() + DAY))).status).toBe(404);
  });

  it("writes the close before and after to the audit log", async () => {
    const election = await anElection();
    const later = new Date(Date.now() + DAY);

    await move(election.id, later);

    const entry = await prisma.auditLog.findFirstOrThrow();
    expect(entry.action).toBe("EXTEND_ELECTION");
    expect(JSON.stringify(entry.after)).toContain(later.toISOString());
    expect(JSON.stringify(entry.before)).toContain(
      new Date(election.startsAt.getTime() + HOUR).toISOString(),
    );
  });
});

describe("a reopened election", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("admits the member who never voted and still refuses the one who did", async () => {
    const election = await anElection({ startsAt: new Date(Date.now() - 3 * DAY) });
    const candidate = await prisma.electionCandidate.create({
      data: { electionId: election.id, fullName: "المترشح" },
    });
    const early = await paidMember();
    await prisma.electionBallot.create({
      data: { electionId: election.id, userId: early.id, candidateId: candidate.id },
    });

    await asOwner();
    await move(election.id, new Date(Date.now() + HOUR));

    const vote = () =>
      VOTE(
        post(`/api/elections/${election.id}/vote`, { candidateId: candidate.id }),
        withId(election.id),
      );
    await signInAs(early);
    expect((await vote()).status).toBe(409);
    await signInAs(await paidMember());
    expect((await vote()).status).toBe(201);
  });

  it("takes its published result off the member screen until the new close", async () => {
    const election = await anElection({ startsAt: new Date(Date.now() - 3 * DAY) });
    const read = async () =>
      (await (await ONE(get(`/api/elections/${election.id}`), withId(election.id))).json()).result;
    expect(await read()).not.toBeNull();

    await asOwner();
    await move(election.id, new Date(Date.now() + HOUR));

    expect(await read()).toBeNull();
  });
});
