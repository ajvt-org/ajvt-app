import { describe, it, expect, beforeEach, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import {
  resetDb,
  post,
  del,
  patch,
  createUser,
  createAdmin,
  signInAs,
  signInAsAdmin,
  withId,
  makeMember,
} from "./helpers";

vi.mock("@/lib/push", () => ({ sendPushToUser: vi.fn(async () => {}) }));

const { POST: SELF_REGISTER, DELETE: SELF_CANCEL } =
  await import("@/app/api/activities/register/route");
const { POST: ADMIN_REGISTER, PATCH: REVIEW } =
  await import("@/app/api/admin/activities/[id]/register/route");
const { GET: LIST_ACTIVITIES } = await import("@/app/api/activities/route");

async function aChessTournament(over: Record<string, unknown> = {}) {
  return prisma.activity.create({
    data: {
      title: "بطولة الشطرنج",
      description: "بطولة فردية",
      isOpen: true,
      isTournament: true,
      profile: "BOARD",
      minTeamSize: 1,
      maxTeamSize: 1,
      autoApprove: true,
      ...over,
    },
  });
}

async function anApprovedMember(phone: string, fullName: string) {
  const user = await createUser(phone);
  await signInAs(user);
  const member = await makeMember({ fullName, age: "البدريين", status: "ACTIVE", userId: user.id });
  return { user, member };
}

const register = (activityId: string, userId: string) =>
  SELF_REGISTER(post("/api/activities/register", { activityId, userId, chosenTeamId: null }));

const entrantsOf = (activityId: string) =>
  prisma.team.findMany({
    where: { activityId },
    include: { members: { select: { userId: true } } },
  });

describe("registering for a singles tournament", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("makes the member an entrant with nobody creating a team", async () => {
    const activity = await aChessTournament();
    const { member } = await anApprovedMember("22000200", "أحمد ولد محمد");

    expect((await register(activity.id, member.userId)).status).toBe(200);

    const entrants = await entrantsOf(activity.id);
    expect(entrants).toHaveLength(1);
    expect(entrants[0].members.map((m) => m.userId)).toEqual([member.userId]);
  });

  it("names the entrant after the player", async () => {
    const activity = await aChessTournament();
    const { member } = await anApprovedMember("22000201", "سالم ولد إبراهيم");

    await register(activity.id, member.userId);

    const [entrant] = await entrantsOf(activity.id);
    expect(entrant.name).toBe("سالم ولد إبراهيم");
    expect(entrant.autoNamed).toBe(true);
  });

  it("waits for approval when the tournament does not approve on its own", async () => {
    const activity = await aChessTournament({ autoApprove: false });
    const { member } = await anApprovedMember("22000202", "علي ولد محمد");

    await register(activity.id, member.userId);
    expect(await entrantsOf(activity.id)).toHaveLength(0);

    const registration = await prisma.activityRegistration.findUniqueOrThrow({
      where: { userId_activityId: { userId: member.userId, activityId: activity.id } },
    });
    await signInAsAdmin(await createAdmin());
    await REVIEW(
      patch(`/api/admin/activities/${activity.id}/register`, {
        registrationId: registration.id,
        status: "ACTIVE",
      }),
      withId(activity.id),
    );

    expect(await entrantsOf(activity.id)).toHaveLength(1);
  });

  it("seats the player when an admin enters them directly", async () => {
    const activity = await aChessTournament();
    const { user } = await anApprovedMember("22000203", "بابا ولد سيدي");
    await signInAsAdmin(await createAdmin());

    await ADMIN_REGISTER(
      post(`/api/admin/activities/${activity.id}/register`, { userId: user.id }),
      withId(activity.id),
    );

    expect(await entrantsOf(activity.id)).toHaveLength(1);
  });

  it("registers twice without seating the player twice", async () => {
    const activity = await aChessTournament();
    const { member } = await anApprovedMember("22000204", "محمد الأمين");

    await register(activity.id, member.userId);
    await register(activity.id, member.userId);

    expect(await entrantsOf(activity.id)).toHaveLength(1);
  });

  it("takes the entrant away again when the player cancels", async () => {
    const activity = await aChessTournament();
    const { member } = await anApprovedMember("22000205", "الشيخ ولد أحمد");
    await register(activity.id, member.userId);

    await SELF_CANCEL(
      del("/api/activities/register", { activityId: activity.id, userId: member.userId }),
    );

    expect(await entrantsOf(activity.id)).toHaveLength(0);
  });

  it("keeps an entrant that already has a fixture when the player cancels", async () => {
    const activity = await aChessTournament();
    const { member } = await anApprovedMember("22000206", "إبراهيم ولد سالم");
    await register(activity.id, member.userId);
    const [entrant] = await entrantsOf(activity.id);
    await prisma.match.create({ data: { activityId: activity.id, homeTeamId: entrant.id } });

    await SELF_CANCEL(
      del("/api/activities/register", { activityId: activity.id, userId: member.userId }),
    );

    expect(await entrantsOf(activity.id)).toHaveLength(1);
  });

  it("leaves a team tournament seating alone", async () => {
    const activity = await aChessTournament({
      minTeamSize: null,
      maxTeamSize: null,
      profile: "FOOTBALL",
    });
    const { member } = await anApprovedMember("22000207", "أحمدو ولد محمد");

    await register(activity.id, member.userId);

    expect(await entrantsOf(activity.id)).toHaveLength(0);
  });

  it("offers no team to pick, since there is nothing to join", async () => {
    const activity = await aChessTournament({ published: true });
    const { member } = await anApprovedMember("22000208", "الحسن ولد أحمد");
    await register(activity.id, member.userId);

    const body = await (await LIST_ACTIVITIES()).json();
    const row = body.activities.find((a: { id: string }) => a.id === activity.id);

    expect(row.teams).toEqual([]);
  });
});
