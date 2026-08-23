import { describe, it, expect, beforeEach } from "vitest";
import { POST as GENERATE } from "@/app/api/admin/activities/[id]/matches/generate/route";
import { prisma } from "@/lib/prisma";
import { resetDb, post, createAdmin, signInAsAdmin, withId } from "./helpers";

const START = new Date("2026-09-07T00:00:00.000Z");

async function twoGroupTournament(startsAt: Date | null) {
  const activity = await prisma.activity.create({
    data: {
      title: "بطولة الجدولة",
      description: "بطولة",
      isTournament: true,
      format: "GROUPS_THEN_KNOCKOUT",
      startsAt,
    },
  });
  for (const groupName of ["الأولى", "الثانية"]) {
    const group = await prisma.group.create({
      data: { activityId: activity.id, name: groupName },
    });
    for (const teamName of ["أ", "ب"]) {
      await prisma.team.create({
        data: { activityId: activity.id, groupId: group.id, name: `${groupName} ${teamName}` },
      });
    }
  }
  return activity;
}

function generate(id: string, body: Record<string, unknown>) {
  return GENERATE(post(`/api/admin/activities/${id}/matches/generate`, body), withId(id));
}

describe("the day-aware schedule generator", () => {
  beforeEach(async () => {
    await resetDb();
    await signInAsAdmin(await createAdmin());
  });

  it("lays each round onto its own day at the given slots and venue", async () => {
    const a = await twoGroupTournament(START);

    const res = await generate(a.id, {
      perTeam: 1,
      times: ["16:00", "17:00"],
      venue: "ملعب كوتش",
    });
    const body = await res.json();

    expect(body).toMatchObject({ created: 2, scheduled: true });
    const matches = await prisma.match.findMany({ orderBy: { order: "asc" } });
    expect(matches[0].matchDate?.toISOString()).toBe("2026-09-07T16:00:00.000Z");
    expect(matches[1].matchDate?.toISOString()).toBe("2026-09-08T16:00:00.000Z");
    expect(matches.every((m) => m.dayId !== null)).toBe(true);
    expect(matches.every((m) => m.venue === "ملعب كوتش")).toBe(true);

    const activity = await prisma.activity.findUniqueOrThrow({ where: { id: a.id } });
    expect(activity.endsAt?.toISOString()).toBe("2026-09-08T00:00:00.000Z");
  });

  it("still creates the matches, undated, when no start date exists", async () => {
    const a = await twoGroupTournament(null);

    const body = await (await generate(a.id, { perTeam: 1 })).json();

    expect(body).toMatchObject({ created: 2, scheduled: false });
    const matches = await prisma.match.findMany();
    expect(matches.every((m) => m.matchDate === null && m.dayId === null)).toBe(true);
  });

  it("says there is nothing left once every team has its matches", async () => {
    const a = await twoGroupTournament(START);
    await generate(a.id, { perTeam: 1 });

    const res = await generate(a.id, { perTeam: 1 });

    expect(res.status).toBe(409);
    expect((await res.json()).error).toContain("1");
  });

  it("honours the requested matches per team", async () => {
    const a = await twoGroupTournament(START);

    const body = await (await generate(a.id, { perTeam: 2, times: ["18:00"] })).json();

    expect(body.created).toBeGreaterThan(2);
  });
});
