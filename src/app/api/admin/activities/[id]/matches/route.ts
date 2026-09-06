import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { MATCH_INCLUDE, listMatches } from "@/lib/adminMatchesServer";
import { requireActivityAccess } from "@/lib/activityAccessServer";
import { logAction, auditContext } from "@/lib/audit";
import { notifyTeams } from "@/lib/tournamentNotify";
import { isValidLeaguePairing } from "@/lib/tournament";
import { parseMatchDate } from "@/lib/clubTime";
import { withRoute } from "@/lib/route";
import { logger } from "@/lib/logger";
import { entrantWording, notify, tournament } from "@/lib/messages";
import { entrantOfActivity } from "@/lib/entrantServer";

export const GET = withRoute(
  "GET /api/admin/activities/[id]/matches",
  async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    await requireActivityAccess(id);

    return NextResponse.json(await listMatches(id));
  },
);

export const POST = withRoute(
  "POST /api/admin/activities/[id]/matches",
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const session = await requireActivityAccess(id);
    const { homeTeamId, awayTeamId, matchDate, round, venue, isKnockout } = await req.json();
    const entrant = await entrantOfActivity(prisma, id);
    const words = entrantWording(entrant);

    if (!homeTeamId || !awayTeamId) {
      return NextResponse.json({ error: words.bothEntrantsRequired }, { status: 400 });
    }
    if (homeTeamId === awayTeamId) {
      return NextResponse.json({ error: words.entrantAgainstItself }, { status: 400 });
    }

    const teams = await prisma.team.findMany({
      where: { id: { in: [homeTeamId, awayTeamId] }, activityId: id },
      select: { id: true, name: true, groupId: true },
    });
    if (teams.length !== 2) {
      return NextResponse.json({ error: words.entrantsNotInTournament }, { status: 400 });
    }
    const homeGroupId = teams.find((t) => t.id === homeTeamId)!.groupId;
    const awayGroupId = teams.find((t) => t.id === awayTeamId)!.groupId;
    if (!isValidLeaguePairing(!!isKnockout, homeGroupId, awayGroupId)) {
      return NextResponse.json({ error: tournament.leaguePairingAcrossGroups }, { status: 400 });
    }
    if (round !== undefined && round !== null && String(round).trim().length > 40) {
      return NextResponse.json({ error: tournament.roundNameTooLong }, { status: 400 });
    }
    if (venue !== undefined && venue !== null && String(venue).trim().length > 60) {
      return NextResponse.json({ error: tournament.venueNameTooLong }, { status: 400 });
    }

    const maxOrderRow = await prisma.match.findFirst({
      where: { activityId: id },
      orderBy: { order: "desc" },
      select: { order: true },
    });

    const match = await prisma.match.create({
      data: {
        activityId: id,
        homeTeamId,
        awayTeamId,
        matchDate: matchDate ? parseMatchDate(matchDate) : null,
        round: round?.trim() || null,
        venue: venue?.trim() || null,
        isKnockout: !!isKnockout,
        order: (maxOrderRow?.order || 0) + 1,
      },
      include: MATCH_INCLUDE,
    });

    const home = teams.find((t) => t.id === homeTeamId)!;
    const away = teams.find((t) => t.id === awayTeamId)!;
    await logAction(session.username, "CREATE_MATCH", `${home.name} × ${away.name}`, {
      ...auditContext(session, req),
      targetType: "Match",
      targetId: match.id,
      after: {
        activityId: id,
        homeTeam: home.name,
        awayTeam: away.name,
        matchDate: match.matchDate,
        isKnockout: match.isKnockout,
      },
    });

    notifyTeams(
      homeTeamId,
      awayTeamId,
      notify.matchScheduled(home.name, away.name, id, entrant),
    ).catch((err) => logger.error("match.created.push.error", err));

    return NextResponse.json({ match }, { status: 201 });
  },
);
