import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withRoute } from "@/lib/route";
import { parse } from "@/lib/validation";
import { handoverSchema } from "./schema";
import { requireCaptainOf } from "@/lib/teamBuildingServer";
import { entrantWording, tournament } from "@/lib/messages";
import { entrantOf } from "@/lib/entrantServer";
import { isMember } from "@/lib/teamInvites";
import { anySideIs } from "@/lib/matchSides";

export const PATCH = withRoute(
  "PATCH /api/teams/[teamId]",
  async (req: NextRequest, { params }: { params: Promise<{ teamId: string }> }) => {
    const { teamId } = await params;
    const { captainUserId } = parse(handoverSchema, await req.json());
    const { activity } = await requireCaptainOf(teamId);

    const seat = await prisma.teamMember.findUnique({
      where: { teamId_userId: { teamId, userId: captainUserId } },
      select: { status: true, invitedByCaptain: true },
    });
    if (!seat || !isMember(seat)) {
      const words = entrantWording(entrantOf(activity));
      return NextResponse.json({ error: words.captainNotInEntrant }, { status: 400 });
    }

    await prisma.team.update({ where: { id: teamId }, data: { captainUserId } });

    return NextResponse.json({ ok: true });
  },
);

export const DELETE = withRoute(
  "DELETE /api/teams/[teamId]",
  async (_req: NextRequest, { params }: { params: Promise<{ teamId: string }> }) => {
    const { teamId } = await params;
    const { team } = await requireCaptainOf(teamId);

    const played = await prisma.match.count({ where: anySideIs([team.id]) });
    if (played > 0) {
      return NextResponse.json({ error: tournament.teamHasMatches }, { status: 409 });
    }

    await prisma.team.delete({ where: { id: teamId } });

    return NextResponse.json({ ok: true });
  },
);
