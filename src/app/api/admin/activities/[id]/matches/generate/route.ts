import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireActivityAccess } from "@/lib/activityAccessServer";
import { logAction } from "@/lib/audit";
import { generateMatchSchedule } from "@/lib/tournament";
import { withRoute } from "@/lib/route";
import { counted } from "@/lib/arabicCount";
import { MATCH } from "@/lib/messages";

const TARGET_PER_TEAM = 3;

export const POST = withRoute(
  "POST /api/admin/activities/[id]/matches/generate",
  async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const session = await requireActivityAccess(id);

    const [teams, existingMatches, maxOrderRow] = await Promise.all([
      prisma.team.findMany({
        where: { activityId: id },
        select: { id: true, name: true, groupId: true, group: { select: { name: true } } },
      }),
      prisma.match.findMany({
        where: { activityId: id },
        select: { homeTeamId: true, awayTeamId: true },
      }),
      prisma.match.findFirst({
        where: { activityId: id },
        orderBy: { order: "desc" },
        select: { order: true },
      }),
    ]);

    if (teams.length < 2) {
      return NextResponse.json({ error: "يحتاج النشاط إلى فريقين على الأقل" }, { status: 400 });
    }

    // Counts/pairs are computed activity-wide so the generator never
    // re-suggests a pairing that already exists, even across groups.
    const existingCounts = new Map<string, number>();
    const existingPairs = new Set<string>();
    for (const m of existingMatches) {
      existingCounts.set(m.homeTeamId, (existingCounts.get(m.homeTeamId) || 0) + 1);
      existingCounts.set(m.awayTeamId, (existingCounts.get(m.awayTeamId) || 0) + 1);
      existingPairs.add([m.homeTeamId, m.awayTeamId].sort().join("|"));
    }

    const pools = new Map<string | null, { name: string; teamIds: string[] }>();
    for (const t of teams) {
      const key = t.groupId;
      if (!pools.has(key)) pools.set(key, { name: t.group?.name || "بدون مجموعة", teamIds: [] });
      pools.get(key)!.teamIds.push(t.id);
    }
    const multiplePools = pools.size > 1;

    type Fixture = { round: number; homeTeamId: string; awayTeamId: string; label: string };
    const allFixtures: Fixture[] = [];
    for (const pool of pools.values()) {
      if (pool.teamIds.length < 2) continue;
      const fixtures = generateMatchSchedule(
        pool.teamIds,
        TARGET_PER_TEAM,
        existingCounts,
        existingPairs,
      );
      for (const f of fixtures) {
        allFixtures.push({
          ...f,
          label: multiplePools ? `${pool.name} — الجولة ${f.round}` : `الجولة ${f.round}`,
        });
      }
    }

    if (allFixtures.length === 0) {
      return NextResponse.json(
        { error: "لا توجد مباريات جديدة لاقتراحها — كل الفرق لديها بالفعل 3 مباريات" },
        { status: 409 },
      );
    }

    allFixtures.sort((a, b) => a.round - b.round);
    let nextOrder = (maxOrderRow?.order || 0) + 1;

    await prisma.match.createMany({
      data: allFixtures.map((f) => ({
        activityId: id,
        homeTeamId: f.homeTeamId,
        awayTeamId: f.awayTeamId,
        round: f.label,
        order: nextOrder++,
      })),
    });

    await logAction(
      session.username,
      "GENERATE_MATCH_SCHEDULE",
      `${counted(allFixtures.length, MATCH)}`,
    );

    return NextResponse.json({ ok: true, created: allFixtures.length });
  },
);
