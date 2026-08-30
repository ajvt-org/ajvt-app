import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { GET as LIST } from "@/app/api/admin/activities/route";
import { resetDb, get, createAdmin, createUsers, makeMember, signInAsAdmin } from "./helpers";

async function anActivityWithOneRegistration() {
  const activity = await prisma.activity.create({
    data: { title: "القافلة الصحية", description: "وصف" },
  });
  const [user] = await createUsers(1);
  const member = await makeMember({
    userId: user.id,
    fullName: "أبوبكر لمرابط",
    age: "البدريين",
    paymentMethod: "بنكيلي",
    status: "ACTIVE",
  });
  await prisma.user.update({ where: { id: user.id }, data: { phone: "33655124" } });
  await prisma.activityRegistration.create({
    data: { activityId: activity.id, userId: user.id, status: "ACTIVE" },
  });
  return { activity, member };
}

describe("the activities the admin list is built from", () => {
  beforeEach(async () => {
    await resetDb();
    await signInAsAdmin(await createAdmin("boss", "SUPER"));
  });

  it("names the person on every registration, the way the list reads it", async () => {
    const { member } = await anActivityWithOneRegistration();

    const body = await (await LIST(get("/api/admin/activities"))).json();

    expect(body.activities[0].registrations[0].member).toEqual({
      id: member.id,
      fullName: "أبوبكر لمرابط",
      phone: "33655124",
      age: "البدريين",
    });
  });

  it("counts the matches a tournament still has to play", async () => {
    const activity = await prisma.activity.create({
      data: { title: "بطولة", description: "وصف", isTournament: true },
    });
    const home = await prisma.team.create({ data: { activityId: activity.id, name: "أ" } });
    const away = await prisma.team.create({ data: { activityId: activity.id, name: "ب" } });
    await prisma.match.create({
      data: { activityId: activity.id, homeTeamId: home.id, awayTeamId: away.id },
    });
    await prisma.match.create({
      data: {
        activityId: activity.id,
        homeTeamId: home.id,
        awayTeamId: away.id,
        status: "PLAYED",
      },
    });

    const body = await (await LIST(get("/api/admin/activities"))).json();
    const row = body.activities.find((a: { id: string }) => a.id === activity.id);

    expect(row.unplayedMatches).toBe(1);
  });
});
