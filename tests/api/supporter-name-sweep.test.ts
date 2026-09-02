import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { OWNER_ROLE, SUPER_ROLE } from "@/lib/adminRoles";
import { DATASETS } from "@/lib/exportRows";
import { ensureReceiptsFor } from "@/lib/paymentReceiptServer";
import { resetDb, createUser, createAdmin, signInAsAdmin, makeMember } from "./helpers";
import { MEMBERSHIP_FEE } from "@/lib/donations";
import { routesUnder, sweep, unresolved, type Fixture } from "./adminRouteSweep";

const GIVER = "الكريم ولد الساتر";

// Where his name may still appear, because it is his account rather than his
// support. Anything else naming him is a leak, so a route added later fails
// this list until somebody looks at it.
const ACCOUNT_SURFACES = [
  "members",
  "members/[id]/profile",
  "members/[id]/memberships",
  "members/[id]/same-person",
  "users",
  "waiting",
  "export/members",
  "quiz/attempts/[id]",
  "quiz/competitions/[id]/participants",
];

async function seed(): Promise<Fixture> {
  const giver = await createUser("44001122");
  await prisma.user.update({ where: { id: giver.id }, data: { fullName: GIVER } });

  await makeMember({
    userId: giver.id,
    status: "ACTIVE",
    paymentMethod: "بنكيلي",
    paymentProof: "membership-slip.webp",
    paidAmount: MEMBERSHIP_FEE + 4900,
  });
  await ensureReceiptsFor(prisma, { userId: giver.id, purpose: "MEMBERSHIP" });

  const activity = await prisma.activity.create({
    data: { title: "مهرجان", description: "وصف" },
  });

  for (const activityId of [null, activity.id]) {
    const payment = await prisma.payment.create({
      data: {
        purpose: activityId ? "ACTIVITY" : "DONATION",
        amount: 5000,
        method: "بنكيلي",
        status: "ACTIVE",
        userId: giver.id,
        donorName: GIVER,
        proof: `slip-${activityId ?? "plain"}.webp`,
        activityId,
      },
    });
    await prisma.donation.create({
      data: {
        id: payment.id,
        donorName: GIVER,
        donorPhone: "44001122",
        amount: 5000,
        status: "ACTIVE",
        source: "SELF",
        paymentMethod: "بنكيلي",
        userId: giver.id,
        proof: payment.proof,
        activityId,
      },
    });
    await ensureReceiptsFor(prisma, { id: payment.id });
  }

  await prisma.auditLog.create({
    data: {
      adminUsername: "boss",
      action: "UPDATE_DONATION",
      targetLabel: `${GIVER} — 5000`,
      targetType: "Donation",
      before: { donorName: GIVER, amount: 5000 },
    },
  });

  const competition = await prisma.competition.create({
    data: { name: "مسابقة", startsAt: new Date() },
  });
  const round = await prisma.quizRound.create({
    data: {
      competitionId: competition.id,
      index: 1,
      opensAt: new Date(Date.now() - 3600_000),
      closesAt: new Date(Date.now() + 3600_000),
    },
  });
  const attempt = await prisma.quizAttempt.create({
    data: { roundId: round.id, userId: giver.id, score: 5 },
  });

  return {
    activityId: activity.id,
    userId: giver.id,
    competitionId: competition.id,
    attemptId: attempt.id,
    datasets: [...DATASETS],
  };
}

function mark(userId: string, confidential: boolean) {
  return prisma.user.update({
    where: { id: userId },
    data: { supportNameConfidential: confidential },
  });
}

describe("every admin route, swept for a confidential supporter name", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("fills a value for every dynamic route it enumerates", async () => {
    const fixture = await seed();

    expect(await unresolved(fixture)).toEqual([]);
  });

  it("reaches the routes it enumerates rather than erroring past them", async () => {
    const fixture = await seed();
    await signInAsAdmin(await createAdmin("boss", SUPER_ROLE));

    const routes = routesUnder(fixture);
    const result = await sweep(routes, GIVER);

    expect(result.threw).toEqual([]);
    expect(result.reached.length).toBeGreaterThan(40);
  });

  it("names him on support routes while he is not marked, so the sweep is not empty", async () => {
    const fixture = await seed();
    await signInAsAdmin(await createAdmin("boss", SUPER_ROLE));

    const { naming } = await sweep(routesUnder(fixture), GIVER);
    const support = naming.filter((route) => !ACCOUNT_SURFACES.includes(route));

    expect(support.length).toBeGreaterThan(0);
  });

  it("names him on no route but his own account once he is marked", async () => {
    const fixture = await seed();
    await mark(fixture.userId, true);
    await signInAsAdmin(await createAdmin("boss", SUPER_ROLE));

    const { naming } = await sweep(routesUnder(fixture), GIVER);

    expect(naming.filter((route) => !ACCOUNT_SURFACES.includes(route))).toEqual([]);
  });

  it("names him to a narrower admin on no route but his own account", async () => {
    const fixture = await seed();
    await mark(fixture.userId, true);
    await signInAsAdmin(await createAdmin("nurse", "MEMBERS"));

    const { naming } = await sweep(routesUnder(fixture), GIVER);

    expect(naming.filter((route) => !ACCOUNT_SURFACES.includes(route))).toEqual([]);
  });

  it("names him to the role that holds the promise everywhere it did before", async () => {
    const fixture = await seed();
    await signInAsAdmin(await createAdmin("owner", OWNER_ROLE));
    const before = await sweep(routesUnder(fixture), GIVER);

    await mark(fixture.userId, true);
    const after = await sweep(routesUnder(fixture), GIVER);

    expect(after.naming).toEqual(before.naming);
    expect(after.naming.length).toBeGreaterThan(0);
  });

  it("leaves every route naming a giver who is not marked", async () => {
    const fixture = await seed();
    await signInAsAdmin(await createAdmin("boss", SUPER_ROLE));
    const before = await sweep(routesUnder(fixture), GIVER);

    await mark(fixture.userId, true);
    await mark(fixture.userId, false);
    const after = await sweep(routesUnder(fixture), GIVER);

    expect(after.naming).toEqual(before.naming);
  });
});
