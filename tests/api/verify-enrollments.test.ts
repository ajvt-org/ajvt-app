import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { loadVerifiedMember } from "@/lib/verifyEnrollmentsServer";
import { MAX_ENROLLMENTS } from "@/lib/verifyEnrollments";
import { resetDb, makeMember } from "./helpers";

const TOKEN = "a".repeat(32);

async function activeMember(verifyToken = TOKEN) {
  return makeMember({
    fullName: "محمد ولد أحمد",
    age: "البدريين",
    paymentMethod: "بنكيلي",
    status: "ACTIVE",
    memberNumber: "AJVT-0001",
    verifyToken,
  });
}

async function activity(title: string, startsAt: Date | null, isVolunteer = false) {
  return prisma.activity.create({
    data: { title, description: "نشاط", startsAt, isVolunteer },
  });
}

async function competition(name: string, startsAt: Date) {
  return prisma.competition.create({
    data: { name, startsAt, roundCount: 5, roundPeriodMinutes: 1440, roundWindowMinutes: 840 },
  });
}

async function enrol(memberId: string, activityId: string, status = "ACTIVE") {
  const owner = await prisma.member.findUniqueOrThrow({
    where: { id: memberId },
    select: { userId: true },
  });
  return prisma.activityRegistration.create({
    data: {
      userId: owner.userId,
      activityId,
      status: status as "ACTIVE" | "PENDING" | "REJECTED",
    },
  });
}

describe("the enrollments behind a verify token", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("gives back nothing for a token nobody holds", async () => {
    await activeMember();

    expect(await loadVerifiedMember("b".repeat(32))).toBeNull();
  });

  it("gives back nothing while the membership is still pending", async () => {
    await makeMember({
      fullName: "أحمد",
      age: "البدريين",
      paymentMethod: "بنكيلي",
      status: "PENDING",
      verifyToken: TOKEN,
    });

    expect(await loadVerifiedMember(TOKEN)).toBeNull();
  });

  it("carries the person and the day they joined", async () => {
    const member = await activeMember();

    const loaded = await loadVerifiedMember(TOKEN);

    expect(loaded).toMatchObject({ fullName: "محمد ولد أحمد", memberNumber: "AJVT-0001" });
    expect(loaded?.memberSince.getTime()).toBe(member.createdAt.getTime());
  });

  it("lists the activities the member was accepted into", async () => {
    const member = await activeMember();
    const summer = await activity("بطولة الصيف", new Date("2026-06-01"));
    await enrol(member.id, summer.id);

    const loaded = await loadVerifiedMember(TOKEN);

    expect(loaded?.enrollments.map((e) => e.label)).toEqual(["بطولة الصيف"]);
    expect(loaded?.enrollments[0].kind).toBe("activity");
  });

  it("leaves out a request that was never accepted", async () => {
    const member = await activeMember();
    const waiting = await activity("قيد المراجعة", new Date("2026-06-01"));
    const refused = await activity("مرفوض", new Date("2026-05-01"));
    await enrol(member.id, waiting.id, "PENDING");
    await enrol(member.id, refused.id, "REJECTED");

    const loaded = await loadVerifiedMember(TOKEN);

    expect(loaded?.enrollments).toHaveLength(0);
  });

  it("lists the quiz competitions the account joined", async () => {
    const member = await activeMember();
    const person = await prisma.member.findUniqueOrThrow({ where: { id: member.id } });
    const ramadan = await competition("مسابقة رمضان", new Date("2026-03-01T00:00:00Z"));
    await prisma.quizParticipant.create({
      data: { competitionId: ramadan.id, userId: person.userId },
    });

    const loaded = await loadVerifiedMember(TOKEN);

    expect(loaded?.enrollments.map((e) => e.kind)).toEqual(["competition"]);
    expect(loaded?.enrollments[0].endsAt?.getTime()).toBe(
      new Date("2026-03-01T00:00:00Z").getTime() + (4 * 1440 + 840) * 60_000,
    );
  });

  it("puts the newest enrollment first whichever kind it is", async () => {
    const member = await activeMember();
    const person = await prisma.member.findUniqueOrThrow({ where: { id: member.id } });
    const old = await activity("نشاط قديم", new Date("2026-01-01"));
    await enrol(member.id, old.id);
    const recent = await competition("مسابقة حديثة", new Date("2026-08-01T00:00:00Z"));
    await prisma.quizParticipant.create({
      data: { competitionId: recent.id, userId: person.userId },
    });

    const loaded = await loadVerifiedMember(TOKEN);

    expect(loaded?.enrollments.map((e) => e.label)).toEqual(["مسابقة حديثة", "نشاط قديم"]);
  });

  it("stops at the cap however many the member joined", async () => {
    const member = await activeMember();
    for (let i = 0; i < MAX_ENROLLMENTS + 4; i++) {
      const made = await activity(`نشاط ${i}`, new Date(2026, i % 12, 1));
      await enrol(member.id, made.id);
    }

    const loaded = await loadVerifiedMember(TOKEN);

    expect(loaded?.enrollments).toHaveLength(MAX_ENROLLMENTS);
  });

  it("keeps an undated activity at the end of the list", async () => {
    const member = await activeMember();
    const undated = await activity("نشاط غير مبرمج", null);
    const dated = await activity("نشاط مبرمج", new Date("2026-02-01"));
    await enrol(member.id, undated.id);
    await enrol(member.id, dated.id);

    const loaded = await loadVerifiedMember(TOKEN);

    expect(loaded?.enrollments.map((e) => e.label)).toEqual(["نشاط مبرمج", "نشاط غير مبرمج"]);
  });
});
