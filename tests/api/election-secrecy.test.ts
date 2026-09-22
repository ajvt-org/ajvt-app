import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { MEMBERSHIP_FEE } from "@/lib/donations";
import { SUPER_ROLE } from "@/lib/adminRoles";
import {
  resetDb,
  get,
  createUser,
  createAdmin,
  signInAsAdmin,
  makeMember,
  withParams,
} from "./helpers";

import { GET as ELECTIONS } from "@/app/api/admin/elections/route";
import { GET as ELECTION } from "@/app/api/admin/elections/[id]/route";
import { GET as AUDIT } from "@/app/api/admin/audit-log/route";
import { GET as EXPORT } from "@/app/api/admin/export/[dataset]/route";
import { DATASETS } from "@/lib/exportRows";

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

async function anElectionWithBallots() {
  const election = await prisma.election.create({
    data: {
      title: "انتخاب اللجنة",
      hidden: false,
      startsAt: new Date(Date.now() - HOUR),
      durationMinutes: 600,
      allowBlank: true,
    },
  });
  await prisma.electionCandidate.createMany({
    data: [
      { electionId: election.id, fullName: "الأول", order: 0 },
      { electionId: election.id, fullName: "الثاني", order: 1 },
    ],
  });
  const candidates = await prisma.electionCandidate.findMany({
    where: { electionId: election.id },
    orderBy: { order: "asc" },
  });

  const voters = [];
  for (const [index, name] of ["ناخب أول", "ناخب ثان", "ناخب ثالث"].entries()) {
    const voter = await paidMember(name);
    voters.push(voter);
    await prisma.electionBallot.create({
      data: {
        electionId: election.id,
        userId: voter.id,
        candidateId: index === 2 ? null : candidates[index].id,
      },
    });
  }

  return { election, candidates, voters };
}

describe("no admin surface pairs a voter with a ballot", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("names no voter on any admin election route", async () => {
    const { election, voters } = await anElectionWithBallots();
    await signInAsAdmin(await createAdmin("boss", SUPER_ROLE));

    const bodies = await Promise.all([
      ELECTIONS(get("/api/admin/elections")).then((res) => res.text()),
      ELECTION(get(`/api/admin/elections/${election.id}`), withParams({ id: election.id })).then(
        (res) => res.text(),
      ),
    ]);

    for (const body of bodies) {
      for (const voter of voters) {
        expect(body).not.toContain(voter.id);
        expect(body).not.toContain(voter.fullName);
      }
      expect(body).not.toContain("userId");
      expect(body).not.toContain('ballots":[');
    }
  });

  it("still counts the ballots it refuses to attribute", async () => {
    const { election } = await anElectionWithBallots();
    await signInAsAdmin(await createAdmin("boss", SUPER_ROLE));

    const body = await (
      await ELECTION(get(`/api/admin/elections/${election.id}`), withParams({ id: election.id }))
    ).json();

    expect(body.election._count.ballots).toBe(3);
    expect(
      body.election.candidates.map((one: { _count: { ballots: number } }) => one._count.ballots),
    ).toEqual([1, 1]);
  });

  it("writes no audit entry when a ballot is cast", async () => {
    await anElectionWithBallots();

    expect(await prisma.auditLog.count()).toBe(0);
  });

  it("names no voter in the audit log after an admin has built the election", async () => {
    const { voters } = await anElectionWithBallots();
    await signInAsAdmin(await createAdmin("boss", SUPER_ROLE));
    await prisma.auditLog.create({
      data: { adminUsername: "boss", action: "CREATE_ELECTION", targetLabel: "انتخاب اللجنة" },
    });

    const body = await (await AUDIT(get("/api/admin/audit-log"))).text();

    for (const voter of voters) expect(body).not.toContain(voter.id);
  });

  it("carries no ballot into any export dataset", async () => {
    await anElectionWithBallots();
    await signInAsAdmin(await createAdmin("boss", SUPER_ROLE));

    for (const dataset of DATASETS) {
      const res = await EXPORT(get(`/api/admin/export/${dataset}`), withParams({ dataset }));
      const body = await res.text();
      expect(body.toLowerCase(), dataset).not.toContain("ballot");
      expect(body, dataset).not.toContain("electionId");
    }
  });

  it("offers no export dataset of ballots at all", () => {
    for (const dataset of DATASETS) {
      expect(dataset.toLowerCase()).not.toContain("ballot");
      expect(dataset.toLowerCase()).not.toContain("election");
    }
  });
});
