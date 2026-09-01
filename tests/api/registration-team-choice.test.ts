import { describe, it, expect, beforeEach, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  resetDb,
  post,
  patch,
  createUser,
  createAdmin,
  signInAs,
  signInAsAdmin,
  withId,
  makeMember,
} from "./helpers";

vi.mock("@/lib/push", () => ({ sendPushToUser: vi.fn(async () => {}) }));

const { POST: SELF_REGISTER } = await import("@/app/api/activities/register/route");
const { PATCH: REVIEW } = await import("@/app/api/admin/activities/[id]/register/route");

async function aTournament(over: Record<string, unknown> = {}) {
  const activity = await prisma.activity.create({
    data: {
      title: "دوري القرية",
      description: "بطولة",
      isOpen: true,
      isTournament: true,
      ...over,
    },
  });
  const teams = [];
  for (const name of ["الصقور", "النسور"]) {
    teams.push(await prisma.team.create({ data: { activityId: activity.id, name } }));
  }
  return { activity, teams };
}

async function anApprovedMember(phone: string, fullName: string) {
  const user = await createUser(phone);
  await signInAs(user);
  const member = await makeMember({ fullName, age: "البدريين", status: "ACTIVE", userId: user.id });
  return { user, member };
}

const register = (activityId: string, userId: string, chosenTeamId: string | null) =>
  SELF_REGISTER(post("/api/activities/register", { activityId, userId, chosenTeamId }));

const rowFor = (userId: string, activityId: string) =>
  prisma.activityRegistration.findUniqueOrThrow({
    where: { userId_activityId: { userId, activityId } },
  });

const teamOf = (userId: string, activityId: string) =>
  prisma.teamMember.findFirst({ where: { userId, team: { activityId } } });

describe("a member picking a team as they register", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("records the team they picked", async () => {
    const { member } = await anApprovedMember("22000100", "محمد");
    const { activity, teams } = await aTournament();

    expect((await register(activity.id, member.userId, teams[0].id)).status).toBe(200);
    expect(await rowFor(member.userId, activity.id)).toMatchObject({ chosenTeamId: teams[0].id });
  });

  it("takes no team at all", async () => {
    const { member } = await anApprovedMember("22000101", "أحمد");
    const { activity } = await aTournament();

    expect((await register(activity.id, member.userId, null)).status).toBe(200);
    expect(await rowFor(member.userId, activity.id)).toMatchObject({ chosenTeamId: null });
  });

  it("refuses a team from another tournament", async () => {
    const { member } = await anApprovedMember("22000102", "علي");
    const { activity } = await aTournament();
    const other = await aTournament({ title: "بطولة أخرى" });

    expect((await register(activity.id, member.userId, other.teams[0].id)).status).toBe(404);
  });

  it("leaves the choice off the team until the registration is approved", async () => {
    const { member } = await anApprovedMember("22000103", "سالم");
    const { activity, teams } = await aTournament();

    await register(activity.id, member.userId, teams[0].id);

    expect(await rowFor(member.userId, activity.id)).toMatchObject({ status: "PENDING" });
    expect(await teamOf(member.userId, activity.id)).toBeNull();
  });

  it("joins the team the moment the activity approves on its own", async () => {
    const { member } = await anApprovedMember("22000104", "يوسف");
    const { activity, teams } = await aTournament({ autoApprove: true });

    await register(activity.id, member.userId, teams[0].id);

    expect(await teamOf(member.userId, activity.id)).toMatchObject({
      teamId: teams[0].id,
      status: "ACTIVE",
    });
  });

  it("joins the team when an admin approves the registration", async () => {
    const { member } = await anApprovedMember("22000105", "عمر");
    const { activity, teams } = await aTournament();
    await register(activity.id, member.userId, teams[1].id);
    const row = await rowFor(member.userId, activity.id);
    await signInAsAdmin(await createAdmin());

    const res = await REVIEW(
      patch(`/api/admin/activities/${activity.id}/register`, {
        registrationId: row.id,
        status: "ACTIVE",
      }),
      withId(activity.id),
    );

    expect(res.status).toBe(200);
    expect(await teamOf(member.userId, activity.id)).toMatchObject({
      teamId: teams[1].id,
      status: "ACTIVE",
    });
  });

  it("puts nobody on a team when the registration is rejected", async () => {
    const { member } = await anApprovedMember("22000106", "خالد");
    const { activity, teams } = await aTournament();
    await register(activity.id, member.userId, teams[0].id);
    const row = await rowFor(member.userId, activity.id);
    await signInAsAdmin(await createAdmin());

    await REVIEW(
      patch(`/api/admin/activities/${activity.id}/register`, {
        registrationId: row.id,
        status: "REJECTED",
        reason: "مكتمل",
      }),
      withId(activity.id),
    );

    expect(await teamOf(member.userId, activity.id)).toBeNull();
  });

  it("leaves a member who is already on a team where they are", async () => {
    const { member } = await anApprovedMember("22000107", "إبراهيم");
    const { activity, teams } = await aTournament();
    await register(activity.id, member.userId, teams[0].id);
    await prisma.teamMember.create({
      data: { teamId: teams[1].id, userId: member.userId, status: "ACTIVE" },
    });
    const row = await rowFor(member.userId, activity.id);
    await signInAsAdmin(await createAdmin());

    await REVIEW(
      patch(`/api/admin/activities/${activity.id}/register`, {
        registrationId: row.id,
        status: "ACTIVE",
      }),
      withId(activity.id),
    );

    expect(await teamOf(member.userId, activity.id)).toMatchObject({ teamId: teams[1].id });
    expect(
      await prisma.teamMember.count({
        where: { userId: member.userId, team: { activityId: activity.id } },
      }),
    ).toBe(1);
  });

  it("approves twice without putting the member on the team twice", async () => {
    const { member } = await anApprovedMember("22000108", "بلال");
    const { activity, teams } = await aTournament();
    await register(activity.id, member.userId, teams[0].id);
    const row = await rowFor(member.userId, activity.id);
    await signInAsAdmin(await createAdmin());
    const approve = () =>
      REVIEW(
        patch(`/api/admin/activities/${activity.id}/register`, {
          registrationId: row.id,
          status: "ACTIVE",
        }),
        withId(activity.id),
      );

    await approve();
    await approve();

    expect(
      await prisma.teamMember.count({
        where: { userId: member.userId, team: { activityId: activity.id } },
      }),
    ).toBe(1);
  });
});
