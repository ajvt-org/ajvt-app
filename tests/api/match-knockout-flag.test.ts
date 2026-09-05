import { describe, it, expect, beforeEach } from "vitest";
import { PATCH as SAVE } from "@/app/api/admin/matches/[matchId]/route";
import { prisma } from "@/lib/prisma";
import { resetDb, patch, createAdmin, signInAsAdmin, withParams } from "./helpers";

const withMatch = (matchId: string) => withParams({ matchId });

async function grouped(overrides: { isKnockout?: boolean; bracketRound?: number | null } = {}) {
  const activity = await prisma.activity.create({
    data: {
      title: "بطولة",
      description: "بطولة",
      isTournament: true,
      format: "GROUPS_THEN_KNOCKOUT",
    },
  });
  const group = await prisma.group.create({
    data: { activityId: activity.id, name: "أ" },
  });
  const home = await prisma.team.create({
    data: { activityId: activity.id, name: "أ", groupId: group.id },
  });
  const away = await prisma.team.create({
    data: { activityId: activity.id, name: "ب", groupId: group.id },
  });
  const match = await prisma.match.create({
    data: {
      activityId: activity.id,
      homeTeamId: home.id,
      awayTeamId: away.id,
      isKnockout: overrides.isKnockout ?? false,
      bracketRound: overrides.bracketRound ?? null,
    },
  });
  return { activity, group, home, away, match };
}

async function ungrouped() {
  const activity = await prisma.activity.create({
    data: { title: "بطولة", description: "بطولة", isTournament: true, format: "KNOCKOUT" },
  });
  const home = await prisma.team.create({ data: { activityId: activity.id, name: "أ" } });
  const away = await prisma.team.create({ data: { activityId: activity.id, name: "ب" } });
  const match = await prisma.match.create({
    data: { activityId: activity.id, homeTeamId: home.id, awayTeamId: away.id },
  });
  return { activity, home, away, match };
}

const save = (matchId: string, body: object) =>
  SAVE(patch(`/api/admin/matches/${matchId}`, body), withMatch(matchId));

const stored = (matchId: string) => prisma.match.findUniqueOrThrow({ where: { id: matchId } });

describe("turning a fixture into a knockout match", () => {
  beforeEach(async () => {
    await resetDb();
    await signInAsAdmin(await createAdmin());
  });

  it("refuses a group fixture", async () => {
    const { match } = await grouped();

    const res = await save(match.id, { isKnockout: true });

    expect(res.status).toBe(400);
    expect(await stored(match.id)).toMatchObject({ isKnockout: false });
  });

  it("takes a fixture whose sides belong to no group", async () => {
    const { match } = await ungrouped();

    const res = await save(match.id, { isKnockout: true });

    expect(res.status).toBe(200);
    expect(await stored(match.id)).toMatchObject({ isKnockout: true });
  });

  it("leaves a match the bracket made alone", async () => {
    const { match } = await grouped({ isKnockout: true, bracketRound: 1 });

    const res = await save(match.id, { isKnockout: true, venue: "ملعب القرية" });

    expect(res.status).toBe(200);
    expect(await stored(match.id)).toMatchObject({ isKnockout: true, venue: "ملعب القرية" });
  });

  it("lets an ordinary save through on a group fixture", async () => {
    const { match } = await grouped();

    const res = await save(match.id, { isKnockout: false, venue: "ملعب القرية" });

    expect(res.status).toBe(200);
    expect(await stored(match.id)).toMatchObject({ isKnockout: false, venue: "ملعب القرية" });
  });
});
