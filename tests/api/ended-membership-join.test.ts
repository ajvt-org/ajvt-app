import { describe, it, expect, beforeEach } from "vitest";
import { POST as JOIN } from "@/app/api/teams/[teamId]/join/route";
import { prisma } from "@/lib/prisma";
import { endMembership } from "@/lib/membershipEndingServer";
import { getAppSettings } from "@/lib/settingsServer";
import { MEMBERSHIP_ENDING_REASONS } from "@/lib/texts";
import { tournament as messages } from "@/lib/messages";
import { resetDb, post, createUser, signInAs, makeMember, withParams } from "./helpers";

async function tournamentTeam() {
  const activity = await prisma.activity.create({
    data: { title: "بطولة الحي", description: "بطولة فرق", isTournament: true, isOpen: true },
  });
  const team = await prisma.team.create({ data: { name: "النجم", activityId: activity.id } });
  return { activity, team };
}

async function playerOn(year: number, activityId: string) {
  const user = await createUser();
  await signInAs(user);
  const member = await makeMember({
    userId: user.id,
    fullName: "محمد ولد أحمد",
    age: "البدريين",
    paymentMethod: "بنكيلي",
    status: "ACTIVE",
    membershipYear: year,
  });
  await prisma.activityRegistration.create({
    data: { userId: member.userId, activityId, status: "ACTIVE" },
  });
  return member;
}

const join = (teamId: string, userId: string) =>
  JOIN(post(`/api/teams/${teamId}/join`, { userId }), withParams({ teamId }));

describe("joining a team on an ended membership", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("refuses the join and says the membership has ended", async () => {
    const { membershipYear } = await getAppSettings();
    const { activity, team } = await tournamentTeam();
    const member = await playerOn(membershipYear, activity.id);
    await endMembership(prisma, member.userId, membershipYear, {
      reason: MEMBERSHIP_ENDING_REASONS[0],
      by: "members-admin",
      at: new Date(),
    });

    const res = await join(team.id, member.userId);

    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: messages.joinMembershipEnded });
    expect(await prisma.teamMember.count()).toBe(0);
  });

  it("still lets a member who is only a year behind join", async () => {
    const { membershipYear } = await getAppSettings();
    const { activity, team } = await tournamentTeam();
    const member = await playerOn(membershipYear - 1, activity.id);

    const res = await join(team.id, member.userId);

    expect(res.status).toBe(200);
    expect(await prisma.teamMember.count()).toBe(1);
  });
});
