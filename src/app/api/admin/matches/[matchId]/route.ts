import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth";
import { logAction } from "@/lib/audit";
import { notifyTeams } from "@/lib/tournamentNotify";

const MATCH_INCLUDE = {
  homeTeam: { select: { id: true, name: true } },
  awayTeam: { select: { id: true, name: true } },
  manOfTheMatch: { select: { id: true, fullName: true } },
  goals: {
    select: {
      id: true,
      count: true,
      teamId: true,
      member: { select: { id: true, fullName: true } },
    },
  },
  bookings: {
    select: {
      id: true,
      cardType: true,
      minute: true,
      teamId: true,
      member: { select: { id: true, fullName: true } },
    },
  },
} as const;

interface GoalInput {
  memberId: string;
  count: number;
}

function validateGoals(input: unknown): GoalInput[] | null {
  if (input === undefined) return [];
  if (!Array.isArray(input)) return null;
  const goals: GoalInput[] = [];
  for (const g of input) {
    if (!g || typeof g.memberId !== "string") return null;
    const count = Number(g.count);
    if (!Number.isInteger(count) || count <= 0) return null;
    goals.push({ memberId: g.memberId, count });
  }
  return goals;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ matchId: string }> }
) {
  try {
    const session = await requireAdmin();
    const { matchId } = await params;
    const {
      homeScore, awayScore, homeGoals, awayGoals, matchDate, round, venue, isKnockout,
      homePenalties, awayPenalties, manOfTheMatchId,
    } = await req.json();

    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: { homeTeam: { select: { id: true, name: true } }, awayTeam: { select: { id: true, name: true } } },
    });
    if (!match) {
      return NextResponse.json({ error: "المباراة غير موجودة" }, { status: 404 });
    }
    const wasPlayed = match.status === "PLAYED";

    const updateData: {
      matchDate?: Date | null;
      round?: string | null;
      venue?: string | null;
      isKnockout?: boolean;
      homeScore?: number | null;
      awayScore?: number | null;
      homePenalties?: number | null;
      awayPenalties?: number | null;
      manOfTheMatchId?: string | null;
      status?: string;
    } = {};

    if (matchDate !== undefined) {
      updateData.matchDate = matchDate ? new Date(matchDate) : null;
    }
    if (round !== undefined) {
      updateData.round = round?.trim() || null;
    }
    if (venue !== undefined) {
      updateData.venue = venue?.trim() || null;
    }
    if (isKnockout !== undefined) {
      updateData.isKnockout = !!isKnockout;
    }

    let parsedHomeGoals: GoalInput[] = [];
    let parsedAwayGoals: GoalInput[] = [];
    const enteringResult = homeScore !== undefined || awayScore !== undefined;

    if (enteringResult) {
      if (homeScore === null && awayScore === null) {
        updateData.homeScore = null;
        updateData.awayScore = null;
        updateData.status = "SCHEDULED";
      } else {
        const hs = Number(homeScore);
        const as = Number(awayScore);
        if (!Number.isInteger(hs) || hs < 0 || !Number.isInteger(as) || as < 0) {
          return NextResponse.json({ error: "النتيجة يجب أن تكون رقماً صحيحاً غير سالب" }, { status: 400 });
        }

        const hg = validateGoals(homeGoals);
        const ag = validateGoals(awayGoals);
        if (hg === null || ag === null) {
          return NextResponse.json({ error: "بيانات الهدافين غير صالحة" }, { status: 400 });
        }
        if (hg.length > 0 && hg.reduce((s, g) => s + g.count, 0) !== hs) {
          return NextResponse.json({ error: "مجموع أهداف لاعبي الفريق المضيف لا يطابق النتيجة" }, { status: 400 });
        }
        if (ag.length > 0 && ag.reduce((s, g) => s + g.count, 0) !== as) {
          return NextResponse.json({ error: "مجموع أهداف لاعبي الفريق الضيف لا يطابق النتيجة" }, { status: 400 });
        }

        if (hg.length > 0 || ag.length > 0) {
          const memberIds = [...hg, ...ag].map((g) => g.memberId);
          const validMembers = await prisma.teamMember.findMany({
            where: {
              memberId: { in: memberIds },
              teamId: { in: [match.homeTeamId, match.awayTeamId] },
            },
            select: { memberId: true, teamId: true },
          });
          const memberTeam = new Map(validMembers.map((m) => [m.memberId, m.teamId]));
          for (const g of hg) {
            if (memberTeam.get(g.memberId) !== match.homeTeamId) {
              return NextResponse.json({ error: "أحد الهدافين ليس ضمن الفريق المضيف" }, { status: 400 });
            }
          }
          for (const g of ag) {
            if (memberTeam.get(g.memberId) !== match.awayTeamId) {
              return NextResponse.json({ error: "أحد الهدافين ليس ضمن الفريق الضيف" }, { status: 400 });
            }
          }
        }

        updateData.homeScore = hs;
        updateData.awayScore = as;
        updateData.status = "PLAYED";
        parsedHomeGoals = hg;
        parsedAwayGoals = ag;
      }
    }

    if (homePenalties !== undefined || awayPenalties !== undefined) {
      if (homePenalties === null && awayPenalties === null) {
        updateData.homePenalties = null;
        updateData.awayPenalties = null;
      } else {
        const hp = Number(homePenalties);
        const ap = Number(awayPenalties);
        if (!Number.isInteger(hp) || hp < 0 || !Number.isInteger(ap) || ap < 0) {
          return NextResponse.json({ error: "نتيجة ركلات الترجيح يجب أن تكون رقماً صحيحاً غير سالب" }, { status: 400 });
        }
        if (hp === ap) {
          return NextResponse.json({ error: "لا يمكن أن تتعادل ركلات الترجيح" }, { status: 400 });
        }
        const effectiveKnockout = updateData.isKnockout ?? match.isKnockout;
        const effectiveHome = updateData.homeScore !== undefined ? updateData.homeScore : match.homeScore;
        const effectiveAway = updateData.awayScore !== undefined ? updateData.awayScore : match.awayScore;
        if (!effectiveKnockout) {
          return NextResponse.json({ error: "ركلات الترجيح متاحة فقط لمباريات خروج المغلوب" }, { status: 400 });
        }
        if (effectiveHome === null || effectiveAway === null || effectiveHome !== effectiveAway) {
          return NextResponse.json({ error: "ركلات الترجيح متاحة فقط عند تعادل النتيجة" }, { status: 400 });
        }
        updateData.homePenalties = hp;
        updateData.awayPenalties = ap;
      }
    }

    if (manOfTheMatchId !== undefined) {
      if (manOfTheMatchId === null) {
        updateData.manOfTheMatchId = null;
      } else {
        const inRoster = await prisma.teamMember.findFirst({
          where: { memberId: manOfTheMatchId, teamId: { in: [match.homeTeamId, match.awayTeamId] } },
        });
        if (!inRoster) {
          return NextResponse.json({ error: "رجل المباراة يجب أن يكون ضمن أحد الفريقين" }, { status: 400 });
        }
        updateData.manOfTheMatchId = manOfTheMatchId;
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      if (enteringResult) {
        await tx.matchGoal.deleteMany({ where: { matchId } });
        if (parsedHomeGoals.length > 0) {
          await tx.matchGoal.createMany({
            data: parsedHomeGoals.map((g) => ({ matchId, memberId: g.memberId, teamId: match.homeTeamId, count: g.count })),
          });
        }
        if (parsedAwayGoals.length > 0) {
          await tx.matchGoal.createMany({
            data: parsedAwayGoals.map((g) => ({ matchId, memberId: g.memberId, teamId: match.awayTeamId, count: g.count })),
          });
        }
      }
      return tx.match.update({ where: { id: matchId }, data: updateData, include: MATCH_INCLUDE });
    });

    if (enteringResult && updateData.status === "PLAYED") {
      await logAction(
        session.username,
        "ENTER_MATCH_RESULT",
        `${match.homeTeam.name} ${updateData.homeScore}-${updateData.awayScore} ${match.awayTeam.name}`
      );
      if (!wasPlayed) {
        notifyTeams(match.homeTeamId, match.awayTeamId, {
          title: "رابطة شباب التاكلالت",
          body: `نتيجة مباراة فريقك: ${match.homeTeam.name} ${updateData.homeScore}-${updateData.awayScore} ${match.awayTeam.name}`,
          url: `/tournament/${match.activityId}`,
        }).catch((err) => console.error("Match result push error:", err));
      }
    }

    return NextResponse.json({ match: updated });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }
    console.error("Match update error:", err);
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ matchId: string }> }
) {
  try {
    const session = await requireAdmin();
    const { matchId } = await params;

    const match = await prisma.match.findUnique({
      where: { id: matchId },
      include: { homeTeam: { select: { name: true } }, awayTeam: { select: { name: true } } },
    });
    if (!match) {
      return NextResponse.json({ error: "المباراة غير موجودة" }, { status: 404 });
    }

    await prisma.match.delete({ where: { id: matchId } });
    await logAction(session.username, "DELETE_MATCH", `${match.homeTeam.name} × ${match.awayTeam.name}`);

    return NextResponse.json({ ok: true });
  } catch (err) {
    if (err instanceof Error && err.message === "UNAUTHORIZED") {
      return NextResponse.json({ error: "غير مصرح" }, { status: 401 });
    }
    console.error("Match delete error:", err);
    return NextResponse.json({ error: "خطأ في الخادم" }, { status: 500 });
  }
}
