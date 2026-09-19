import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { resetDb, patch, createAdmin, signInAsAdmin } from "./helpers";

import { PATCH as SET_TEAM } from "@/app/api/admin/teams/[teamId]/route";

const withTeam = (teamId: string) => ({ params: Promise.resolve({ teamId }) });

const setDisabled = (teamId: string, disabled: boolean) =>
  SET_TEAM(patch(`/api/admin/teams/${teamId}`, { disabled }), withTeam(teamId));

async function aTeam() {
  const activity = await prisma.activity.create({
    data: { title: "بطولة", description: "بطولة", isTournament: true },
  });
  return prisma.team.create({ data: { activityId: activity.id, name: "فريق النجم" } });
}

const disabledAt = async (teamId: string) =>
  (await prisma.team.findUnique({ where: { id: teamId } }))?.disabledAt ?? null;

describe("disabling a team", () => {
  beforeEach(async () => {
    await resetDb();
    await signInAsAdmin(await createAdmin());
  });

  it("records the moment it was disabled", async () => {
    const team = await aTeam();

    const res = await setDisabled(team.id, true);

    expect(res.status).toBe(200);
    expect(await disabledAt(team.id)).toBeInstanceOf(Date);
  });

  it("clears the moment when the team is brought back", async () => {
    const team = await aTeam();
    await setDisabled(team.id, true);

    await setDisabled(team.id, false);

    expect(await disabledAt(team.id)).toBeNull();
  });

  it("keeps the first moment when asked twice", async () => {
    const team = await aTeam();
    await setDisabled(team.id, true);
    const first = await disabledAt(team.id);

    await setDisabled(team.id, true);

    expect(await disabledAt(team.id)).toEqual(first);
  });

  it("leaves the team alone when nothing is said about it", async () => {
    const team = await aTeam();
    await setDisabled(team.id, true);

    await SET_TEAM(
      patch(`/api/admin/teams/${team.id}`, { name: "فريق الوحدة" }),
      withTeam(team.id),
    );

    expect(await disabledAt(team.id)).toBeInstanceOf(Date);
  });

  it("writes the decision to the log under its own name", async () => {
    const team = await aTeam();

    await setDisabled(team.id, true);
    await setDisabled(team.id, false);

    const actions = await prisma.auditLog.findMany({
      where: { targetType: "Team" },
      orderBy: { createdAt: "asc" },
      select: { action: true },
    });
    expect(actions.map((a) => a.action)).toEqual(["DISABLE_TEAM", "ENABLE_TEAM"]);
  });
});
