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
import { sideIdData } from "@/lib/matchSides";

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
    const { firstTeamId, secondTeamId, matchDate, round, venue, isKnockout } = await req.json();
    const activity = await prisma.activity.findUniqueOrThrow({
      where: { id },
      select: { matchShape: true },
    });
    const entrant = await entrantOfActivity(prisma, id);
    const words = entrantWording(entrant);

    if (!firstTeamId || !secondTeamId) {
      return NextResponse.json({ error: words.bothEntrantsRequired }, { status: 400 });
    }
    if (firstTeamId === secondTeamId) {
      return NextResponse.json({ error: words.entrantAgainstItself }, { status: 400 });
    }

    const teams = await prisma.team.findMany({
      where: { id: { in: [firstTeamId, secondTeamId] }, activityId: id },
      select: { id: true, name: true, groupId: true },
    });
    if (teams.length !== 2) {
      return NextResponse.json({ error: words.entrantsNotInTournament }, { status: 400 });
    }
    const firstGroupId = teams.find((t) => t.id === firstTeamId)!.groupId;
    const secondGroupId = teams.find((t) => t.id === secondTeamId)!.groupId;
    if (!isValidLeaguePairing(!!isKnockout, firstGroupId, secondGroupId)) {
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
        ...sideIdData(activity.matchShape, firstTeamId, secondTeamId),
        matchDate: matchDate ? parseMatchDate(matchDate) : null,
        round: round?.trim() || null,
        venue: venue?.trim() || null,
        isKnockout: !!isKnockout,
        order: (maxOrderRow?.order || 0) + 1,
      },
      include: MATCH_INCLUDE,
    });

    const first = teams.find((t) => t.id === firstTeamId)!;
    const second = teams.find((t) => t.id === secondTeamId)!;
    await logAction(session.username, "CREATE_MATCH", `${first.name} × ${second.name}`, {
      ...auditContext(session, req),
      targetType: "Match",
      targetId: match.id,
      after: {
        activityId: id,
        firstTeam: first.name,
        secondTeam: second.name,
        matchDate: match.matchDate,
        isKnockout: match.isKnockout,
      },
    });

    notifyTeams(
      firstTeamId,
      secondTeamId,
      notify.matchScheduled(first.name, second.name, id, entrant),
    ).catch((err) => logger.error("match.created.push.error", err));

    return NextResponse.json({ match }, { status: 201 });
  },
);
