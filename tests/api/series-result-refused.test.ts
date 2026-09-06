import { describe, it, expect, beforeEach } from "vitest";
import { prisma } from "@/lib/prisma";
import { resetDb, patch, createAdmin, signInAsAdmin, makeMember } from "./helpers";
import { tournament as messages } from "@/lib/messages";
import { sideIdData } from "@/lib/matchSides";

import { PATCH as SAVE_RESULT } from "@/app/api/admin/matches/[matchId]/route";

const withMatch = (matchId: string) => ({ params: Promise.resolve({ matchId }) });

async function tournamentOfShape(matchShape: "FOOTBALL" | "SERIES") {
  const activity = await prisma.activity.create({
    data: {
      title: "بطولة",
      description: "بطولة",
      isTournament: true,
      matchShape,
    },
  });
  const home = await prisma.team.create({ data: { activityId: activity.id, name: "أ" } });
  const away = await prisma.team.create({ data: { activityId: activity.id, name: "ب" } });
  const players = [];
  for (let i = 0; i < 2; i++) {
    const member = await makeMember({
      fullName: `لاعب ${i}`,
      age: "البدريين",
      paymentMethod: "بنكيلي",
      status: "ACTIVE",
    });
    await prisma.teamMember.create({
      data: { teamId: i === 0 ? home.id : away.id, userId: member.userId, status: "ACTIVE" },
    });
    players.push(member);
  }
  const match = await prisma.match.create({
    data: {
      activityId: activity.id,
      ...sideIdData(matchShape, home.id, away.id),
      matchDate: new Date(Date.now() - 60 * 60_000),
      status: "PLAYED",
      homeScore: 1,
      awayScore: 0,
    },
  });
  return { activity, match, players };
}

describe("a result on a series match", () => {
  beforeEach(async () => {
    await resetDb();
    await signInAsAdmin(await createAdmin("boss", "SUPER"));
  });

  it("refuses a score, and stores nothing", async () => {
    const { match } = await tournamentOfShape("SERIES");
    await prisma.match.update({
      where: { id: match.id },
      data: { status: "SCHEDULED", homeScore: null, awayScore: null },
    });

    const res = await SAVE_RESULT(
      patch(`/api/admin/matches/${match.id}`, { homeScore: 1, awayScore: 0 }),
      withMatch(match.id),
    );

    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe(messages.seriesResultNotReady);
    const stored = await prisma.match.findUniqueOrThrow({ where: { id: match.id } });
    expect(stored.homeScore).toBeNull();
    expect(stored.status).toBe("SCHEDULED");
  });

  it("refuses goal events too", async () => {
    const { match, players } = await tournamentOfShape("SERIES");

    const res = await SAVE_RESULT(
      patch(`/api/admin/matches/${match.id}`, {
        goalEvents: [
          {
            teamId: (
              await prisma.teamMember.findFirstOrThrow({ where: { userId: players[0].userId } })
            ).teamId,
            userId: players[0].userId,
            kind: "GOAL",
            period: "REGULAR",
            minute: null,
          },
        ],
      }),
      withMatch(match.id),
    );

    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe(messages.seriesResultNotReady);
  });

  it("still lets a result already stored be cleared", async () => {
    const { match } = await tournamentOfShape("SERIES");

    const res = await SAVE_RESULT(
      patch(`/api/admin/matches/${match.id}`, { homeScore: null, awayScore: null }),
      withMatch(match.id),
    );

    expect(res.status).toBe(200);
    const stored = await prisma.match.findUniqueOrThrow({ where: { id: match.id } });
    expect(stored.homeScore).toBeNull();
    expect(stored.status).toBe("SCHEDULED");
  });

  it("still takes a football result", async () => {
    const { match } = await tournamentOfShape("FOOTBALL");
    await prisma.match.update({
      where: { id: match.id },
      data: { status: "SCHEDULED", homeScore: null, awayScore: null },
    });

    const res = await SAVE_RESULT(
      patch(`/api/admin/matches/${match.id}`, { homeScore: 2, awayScore: 1 }),
      withMatch(match.id),
    );

    expect(res.status).toBe(200);
    const stored = await prisma.match.findUniqueOrThrow({ where: { id: match.id } });
    expect(stored.homeScore).toBe(2);
    expect(stored.status).toBe("PLAYED");
  });
});
