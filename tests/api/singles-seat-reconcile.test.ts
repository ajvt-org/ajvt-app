import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { PATCH } from "@/app/api/admin/activities/[id]/route";
import { resetDb, patch, createAdmin, createUsers, signInAsAdmin, withId } from "./helpers";

const SINGLES = { isTournament: true, minTeamSize: 1, maxTeamSize: 1 };

function edit(id: string, body: Record<string, unknown>) {
  return PATCH(patch(`/api/admin/activities/${id}`, body), withId(id));
}

async function anActivity(over: Record<string, unknown> = {}) {
  return prisma.activity.create({
    data: { title: "بطولة الشطرنج", description: "بطولة", isOpen: true, ...over },
  });
}

async function registered(activityId: string, count: number, status = "ACTIVE") {
  const people = await createUsers(count);
  for (const person of people) {
    await prisma.activityRegistration.create({
      data: { activityId, userId: person.id, status: status as "ACTIVE" },
    });
  }
  return people;
}

const seats = (activityId: string) =>
  prisma.team.findMany({
    where: { activityId },
    select: { name: true, autoNamed: true, members: { select: { userId: true } } },
  });

describe("seating the registrants of a tournament that becomes singles", () => {
  beforeEach(async () => {
    await resetDb();
    await signInAsAdmin(await createAdmin());
  });

  it("seats the accepted registrations that were made before the squad was set", async () => {
    const activity = await anActivity({ isTournament: true });
    const people = await registered(activity.id, 3);

    await edit(activity.id, SINGLES);

    const seated = await seats(activity.id);
    expect(seated).toHaveLength(3);
    expect(seated.every((team) => team.autoNamed)).toBe(true);
    expect(seated.flatMap((team) => team.members.map((m) => m.userId)).sort()).toEqual(
      people.map((p) => p.id).sort(),
    );
  });

  it("seats them when a plain activity becomes a singles tournament", async () => {
    const activity = await anActivity();
    await registered(activity.id, 2);

    await edit(activity.id, SINGLES);

    expect(await seats(activity.id)).toHaveLength(2);
  });

  it("leaves a registration that was never accepted unseated", async () => {
    const activity = await anActivity({ isTournament: true });
    await registered(activity.id, 2, "PENDING");
    await registered(activity.id, 1, "ACTIVE");

    await edit(activity.id, SINGLES);

    expect(await seats(activity.id)).toHaveLength(1);
  });

  it("does not seat anyone twice when it runs again", async () => {
    const activity = await anActivity({ isTournament: true });
    await registered(activity.id, 3);

    await edit(activity.id, SINGLES);
    await edit(activity.id, SINGLES);

    expect(await seats(activity.id)).toHaveLength(3);
  });

  it("names each seat after the person it holds", async () => {
    const activity = await anActivity({ isTournament: true });
    const [person] = await registered(activity.id, 1);
    await prisma.user.update({ where: { id: person.id }, data: { fullName: "سالم ولد علي" } });

    await edit(activity.id, SINGLES);

    expect((await seats(activity.id))[0].name).toBe("سالم ولد علي");
  });
});

describe("clearing the seats when a tournament stops being singles", () => {
  beforeEach(async () => {
    await resetDb();
    await signInAsAdmin(await createAdmin());
  });

  it("removes the seats it made once the squad opens up", async () => {
    const activity = await anActivity({ isTournament: true });
    await registered(activity.id, 3);
    await edit(activity.id, SINGLES);

    await edit(activity.id, { minTeamSize: 5, maxTeamSize: 7 });

    expect(await seats(activity.id)).toHaveLength(0);
  });

  it("removes them when the tournament stops being a tournament", async () => {
    const activity = await anActivity({ isTournament: true });
    await registered(activity.id, 2);
    await edit(activity.id, SINGLES);

    await edit(activity.id, { isTournament: false });

    expect(await seats(activity.id)).toHaveLength(0);
  });

  it("keeps a seat that was given a name of its own", async () => {
    const activity = await anActivity({ isTournament: true });
    await registered(activity.id, 2);
    await edit(activity.id, SINGLES);
    const [first] = await prisma.team.findMany({ where: { activityId: activity.id } });
    await prisma.team.update({
      where: { id: first.id },
      data: { name: "فريق النجم", autoNamed: false },
    });

    await edit(activity.id, { minTeamSize: 5, maxTeamSize: 7 });

    const left = await seats(activity.id);
    expect(left.map((team) => team.name)).toEqual(["فريق النجم"]);
  });

  it("keeps a seat that has picked up a second member", async () => {
    const activity = await anActivity({ isTournament: true });
    await registered(activity.id, 2);
    await edit(activity.id, SINGLES);
    const [first] = await prisma.team.findMany({ where: { activityId: activity.id } });
    const [extra] = await createUsers(1);
    await prisma.teamMember.create({
      data: { teamId: first.id, userId: extra.id, status: "ACTIVE" },
    });

    await edit(activity.id, { minTeamSize: 5, maxTeamSize: 7 });

    expect(await seats(activity.id)).toHaveLength(1);
  });

  it("keeps a seat that has already played", async () => {
    const activity = await anActivity({ isTournament: true });
    await registered(activity.id, 2);
    await edit(activity.id, SINGLES);
    const [home, away] = await prisma.team.findMany({ where: { activityId: activity.id } });
    await prisma.match.create({
      data: { activityId: activity.id, homeTeamId: home.id, awayTeamId: away.id },
    });

    await edit(activity.id, { minTeamSize: 5, maxTeamSize: 7 });

    expect(await seats(activity.id)).toHaveLength(2);
  });
});
