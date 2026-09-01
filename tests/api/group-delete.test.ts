import { describe, it, expect, beforeEach } from "vitest";
import { DELETE } from "@/app/api/admin/groups/[groupId]/route";
import { prisma } from "@/lib/prisma";
import { tournament } from "@/lib/messages";
import { resetDb, del, createAdmin, signInAsAdmin, withParams } from "./helpers";

async function groupedActivity() {
  const activity = await prisma.activity.create({
    data: {
      title: "بطولة المجموعات",
      description: "بطولة",
      isTournament: true,
      format: "GROUPS_THEN_KNOCKOUT",
    },
  });
  const groups = [];
  for (const name of ["المجموعة 1", "المجموعة 2"]) {
    groups.push(
      await prisma.group.create({ data: { activityId: activity.id, name, capacity: 2 } }),
    );
  }
  const teams = [];
  for (const [i, name] of ["أ1", "أ2", "ب1", "ب2"].entries()) {
    teams.push(
      await prisma.team.create({
        data: { activityId: activity.id, name, groupId: groups[i < 2 ? 0 : 1].id },
      }),
    );
  }
  return { activity, groups, teams };
}

const remove = (groupId: string) =>
  DELETE(del(`/api/admin/groups/${groupId}`), withParams({ groupId }));

describe("deleting a group", () => {
  beforeEach(async () => {
    await resetDb();
    await signInAsAdmin(await createAdmin());
  });

  it("goes through while the tournament has no fixtures", async () => {
    const { groups } = await groupedActivity();

    const res = await remove(groups[0].id);

    expect(res.status).toBe(200);
    expect(await prisma.group.count()).toBe(1);
  });

  it("refuses once the tournament has fixtures", async () => {
    const { activity, groups, teams } = await groupedActivity();
    await prisma.match.create({
      data: {
        activityId: activity.id,
        homeTeamId: teams[0].id,
        awayTeamId: teams[1].id,
        round: "المجموعة 1 — الجولة 1",
        order: 1,
      },
    });

    const res = await remove(groups[0].id);

    expect(res.status).toBe(409);
    expect((await res.json()).error).toBe(tournament.groupHasMatches);
    expect(await prisma.group.count()).toBe(2);
  });

  it("refuses over a fixture that has no teams yet", async () => {
    const { activity, groups } = await groupedActivity();
    await prisma.match.create({
      data: {
        activityId: activity.id,
        isKnockout: true,
        bracketRound: 1,
        round: "نصف النهائي",
        order: 1,
      },
    });

    const res = await remove(groups[1].id);

    expect(res.status).toBe(409);
    expect(await prisma.group.count()).toBe(2);
  });

  it("leaves a group in another tournament alone", async () => {
    const { activity, teams } = await groupedActivity();
    await prisma.match.create({
      data: {
        activityId: activity.id,
        homeTeamId: teams[0].id,
        awayTeamId: teams[1].id,
        order: 1,
      },
    });
    const other = await prisma.activity.create({
      data: { title: "بطولة أخرى", description: "بطولة", isTournament: true },
    });
    const spare = await prisma.group.create({
      data: { activityId: other.id, name: "المجموعة 1" },
    });

    expect((await remove(spare.id)).status).toBe(200);
  });
});
