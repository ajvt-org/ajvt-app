import { describe, it, expect, beforeEach, vi } from "vitest";
import { prisma } from "@/lib/prisma";
import { resetDb, createUser, signInAs } from "./helpers";

vi.mock("@/lib/push", () => ({ sendPushToUser: vi.fn(async () => {}) }));

const { GET } = await import("@/app/api/user/matches/route");

async function memberFor(userId: string | null, fullName: string) {
  return prisma.member.create({
    data: { fullName, age: "البدريين", paymentMethod: "بنكيلي", status: "ACTIVE", userId },
  });
}

async function tournament(title: string) {
  return prisma.activity.create({
    data: { title, description: "وصف", isTournament: true, format: "KNOCKOUT" },
  });
}

async function teamWith(activityId: string, name: string, memberId?: string, status = "ACTIVE") {
  const team = await prisma.team.create({ data: { activityId, name } });
  if (memberId) {
    await prisma.teamMember.create({
      data: { teamId: team.id, memberId, status: status as "ACTIVE" | "PENDING" },
    });
  }
  return team;
}

async function fixtures() {
  return (await (await GET()).json()) as {
    teamCount: number;
    upcoming: { id: string; matchDate: string | null; activity: { title: string } }[];
    past: { id: string; homeScore: number | null }[];
  };
}

describe("GET /api/user/matches", () => {
  beforeEach(async () => {
    await resetDb();
  });

  it("gives a member with no team the empty shape, not an error", async () => {
    const user = await createUser("22000050");
    await memberFor(user.id, "عضو");
    await signInAs(user);

    const body = await fixtures();

    expect(body).toMatchObject({ teamCount: 0, upcoming: [], past: [] });
  });

  it("gathers matches across two activities, soonest first", async () => {
    const user = await createUser("22000051");
    const member = await memberFor(user.id, "عضو");
    await signInAs(user);

    const first = await tournament("البطولة الكبرى");
    const second = await tournament("بطولة الناشئين");
    const mine1 = await teamWith(first.id, "الأزرق", member.id);
    const rival1 = await teamWith(first.id, "النجوم");
    const mine2 = await teamWith(second.id, "الأخضر", member.id);
    const rival2 = await teamWith(second.id, "الهلال");

    await prisma.match.create({
      data: {
        activityId: second.id,
        homeTeamId: mine2.id,
        awayTeamId: rival2.id,
        matchDate: new Date("2026-04-01T15:00:00.000Z"),
      },
    });
    await prisma.match.create({
      data: {
        activityId: first.id,
        homeTeamId: mine1.id,
        awayTeamId: rival1.id,
        matchDate: new Date("2026-03-01T15:00:00.000Z"),
      },
    });

    const body = await fixtures();

    expect(body.teamCount).toBe(2);
    expect(body.upcoming.map((m) => m.activity.title)).toEqual([
      "البطولة الكبرى",
      "بطولة الناشئين",
    ]);
  });

  it("ignores a pending team join, which is a request not a fixture", async () => {
    const user = await createUser("22000052");
    const member = await memberFor(user.id, "عضو");
    await signInAs(user);

    const activity = await tournament("البطولة");
    const mine = await teamWith(activity.id, "الأزرق", member.id, "PENDING");
    const rival = await teamWith(activity.id, "النجوم");
    await prisma.match.create({
      data: { activityId: activity.id, homeTeamId: mine.id, awayTeamId: rival.id },
    });

    expect(await fixtures()).toMatchObject({ teamCount: 0, upcoming: [] });
  });

  it("keeps an undated bracket match, and puts it last", async () => {
    const user = await createUser("22000053");
    const member = await memberFor(user.id, "عضو");
    await signInAs(user);

    const activity = await tournament("البطولة");
    const mine = await teamWith(activity.id, "الأزرق", member.id);
    const rival = await teamWith(activity.id, "النجوم");
    await prisma.match.create({
      data: {
        activityId: activity.id,
        homeTeamId: mine.id,
        awayTeamId: rival.id,
        isKnockout: true,
        round: "نصف النهائي",
      },
    });
    await prisma.match.create({
      data: {
        activityId: activity.id,
        homeTeamId: mine.id,
        awayTeamId: rival.id,
        matchDate: new Date("2026-03-01T15:00:00.000Z"),
      },
    });

    const body = await fixtures();

    expect(body.upcoming).toHaveLength(2);
    expect(body.upcoming[1].matchDate).toBeNull();
  });

  it("reports a played match with its penalties", async () => {
    const user = await createUser("22000054");
    const member = await memberFor(user.id, "عضو");
    await signInAs(user);

    const activity = await tournament("البطولة");
    const mine = await teamWith(activity.id, "الأزرق", member.id);
    const rival = await teamWith(activity.id, "النجوم");
    await prisma.match.create({
      data: {
        activityId: activity.id,
        homeTeamId: mine.id,
        awayTeamId: rival.id,
        status: "PLAYED",
        homeScore: 1,
        awayScore: 1,
        homePenalties: 4,
        awayPenalties: 3,
        matchDate: new Date("2026-02-01T15:00:00.000Z"),
      },
    });

    const body = await fixtures();

    expect(body.upcoming).toHaveLength(0);
    expect(body.past).toHaveLength(1);
    expect(body.past[0].homeScore).toBe(1);
  });

  it("does not hand over another member's fixtures", async () => {
    const other = await createUser("22000055");
    const otherMember = await memberFor(other.id, "آخر");
    const activity = await tournament("البطولة");
    const theirs = await teamWith(activity.id, "الأزرق", otherMember.id);
    const rival = await teamWith(activity.id, "النجوم");
    await prisma.match.create({
      data: { activityId: activity.id, homeTeamId: theirs.id, awayTeamId: rival.id },
    });

    const user = await createUser("22000056");
    await memberFor(user.id, "عضو");
    await signInAs(user);

    expect(await fixtures()).toMatchObject({ teamCount: 0, upcoming: [] });
  });
});
