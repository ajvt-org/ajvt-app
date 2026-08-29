import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { GET as ATTENTION } from "@/app/api/admin/activities/attention/route";
import { GET as SUMMARY } from "@/app/api/admin/notifications/summary/route";
import { resetDb, get, createAdmin, createUsers, signInAsAdmin, makeMember } from "./helpers";

async function anActivity(title = "كأس الرابطة", over: Record<string, unknown> = {}) {
  return prisma.activity.create({
    data: { title, description: "بطولة", isTournament: true, isOpen: true, ...over },
  });
}

async function aMember(name: string) {
  const [user] = await createUsers(1);
  return makeMember({
    fullName: name,
    age: "البدريين",
    paymentMethod: "بنكيلي",
    status: "ACTIVE",
    userId: user.id,
  });
}

async function joinRequest(activityId: string, name: string, teamName = "الشناقطة") {
  const team = await prisma.team.create({ data: { activityId, name: teamName } });
  const member = await aMember(name);
  return prisma.teamMember.create({
    data: { teamId: team.id, memberId: member.id, userId: member.userId, status: "PENDING" },
  });
}

async function registrationRequest(activityId: string, name: string) {
  const member = await aMember(name);
  return prisma.activityRegistration.create({
    data: { activityId, memberId: member.id, userId: member.userId, status: "PENDING" },
  });
}

async function proposedSuspension(activityId: string, name: string) {
  const member = await aMember(name);
  return prisma.suspension.create({
    data: {
      activityId,
      memberId: member.id,
      userId: member.userId,
      reason: "RED_CARD",
      scope: "MATCHES",
      matches: 1,
      status: "PROPOSED",
      createdBy: "admin",
    },
  });
}

async function waiting() {
  const body = await (await ATTENTION(get("/api/admin/activities/attention"))).json();
  return body.waiting as { kind: string; who: string; activityTitle: string }[];
}

describe("what is waiting across the activities", () => {
  beforeEach(async () => {
    await resetDb();
    await signInAsAdmin(await createAdmin());
  });

  it("gathers a join request, a registration and a proposed suspension", async () => {
    const activity = await anActivity();
    await joinRequest(activity.id, "محمد");
    await registrationRequest(activity.id, "أحمد");
    await proposedSuspension(activity.id, "سالم");

    expect((await waiting()).map((r) => r.kind).sort()).toEqual([
      "join",
      "registration",
      "suspension",
    ]);
  });

  it("names the activity each one belongs to", async () => {
    const cup = await anActivity("كأس الرابطة");
    const youth = await anActivity("بطولة الناشئين");
    await joinRequest(cup.id, "محمد");
    await registrationRequest(youth.id, "أحمد");

    const rows = await waiting();
    const byWho = Object.fromEntries(rows.map((r) => [r.who.split(" — ")[0], r.activityTitle]));
    expect(byWho["محمد"]).toBe("كأس الرابطة");
    expect(byWho["أحمد"]).toBe("بطولة الناشئين");
  });

  it("says which team a join request is for", async () => {
    const activity = await anActivity();
    await joinRequest(activity.id, "محمد", "الفرسان");

    expect((await waiting())[0].who).toBe("محمد — الفرسان");
  });

  it("leaves out what has already been settled", async () => {
    const activity = await anActivity();
    const member = await aMember("محمد");
    const team = await prisma.team.create({ data: { activityId: activity.id, name: "الشناقطة" } });
    await prisma.teamMember.create({
      data: { teamId: team.id, memberId: member.id, userId: member.userId, status: "ACTIVE" },
    });
    const other = await aMember("أحمد");
    await prisma.activityRegistration.create({
      data: { activityId: activity.id, memberId: other.id, userId: other.userId, status: "ACTIVE" },
    });

    expect(await waiting()).toEqual([]);
  });

  it("puts what has waited longest first", async () => {
    const activity = await anActivity();
    const recent = await registrationRequest(activity.id, "الجديد");
    const old = await registrationRequest(activity.id, "القديم");
    await prisma.activityRegistration.update({
      where: { id: old.id },
      data: { createdAt: new Date("2026-01-01T00:00:00.000Z") },
    });
    await prisma.activityRegistration.update({
      where: { id: recent.id },
      data: { createdAt: new Date("2026-08-28T00:00:00.000Z") },
    });

    expect((await waiting()).map((r) => r.who)).toEqual(["القديم", "الجديد"]);
  });

  it("says nothing is waiting when nothing is", async () => {
    await anActivity();

    expect(await waiting()).toEqual([]);
  });

  it("counts the same list on the badge", async () => {
    const activity = await anActivity();
    await joinRequest(activity.id, "محمد");
    await registrationRequest(activity.id, "أحمد");
    await proposedSuspension(activity.id, "سالم");

    const body = await (await SUMMARY(get("/api/admin/notifications/summary"))).json();

    expect(body.pendingActivityWork).toBe(3);
    expect(body.pendingActivityWork).toBe((await waiting()).length);
  });
});
