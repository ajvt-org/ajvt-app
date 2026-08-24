import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireActivityAccess } from "@/lib/activityAccessServer";
import { logAction, auditContext } from "@/lib/audit";
import { withRoute } from "@/lib/route";
import { normalizeTeamSize } from "@/lib/teamSize";
import { parse } from "@/lib/validation";
import { activityUpdateSchema } from "./schema";
import { activities, tournament } from "@/lib/messages";
import type { SportProfile, TournamentFormat } from "@prisma/client";

export const GET = withRoute(
  "GET /api/admin/activities/[id]",
  async (_req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    await requireActivityAccess(id);
    const activity = await prisma.activity.findUnique({
      where: { id },
      select: {
        id: true,
        title: true,
        photo: true,
        isTournament: true,
        format: true,
        profile: true,
        teamSize: true,
        startsAt: true,
        endsAt: true,
      },
    });
    if (!activity) return NextResponse.json({ error: activities.notFound }, { status: 404 });
    return NextResponse.json({ activity });
  },
);

export const PATCH = withRoute(
  "PATCH /api/admin/activities/[id]",
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const session = await requireActivityAccess(id);
    const {
      title,
      description,
      period,
      capacity,
      isOpen,
      autoApprove,
      photo,
      isTournament,
      format,
      profile,
      teamSize,
      yellowsForBan,
      redBanMatches,
      isVolunteer,
      whatsappLink,
      order,
      startsAt,
      endsAt,
      withTime,
    } = parse(activityUpdateSchema, await req.json());

    const existing = await prisma.activity.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: activities.notFound }, { status: 404 });
    }

    const data: {
      title?: string;
      description?: string;
      period?: string | null;
      capacity?: number | null;
      isOpen?: boolean;
      autoApprove?: boolean;
      photo?: string | null;
      isTournament?: boolean;
      format?: TournamentFormat | null;
      profile?: SportProfile;
      teamSize?: number | null;
      yellowsForBan?: number;
      redBanMatches?: number;
      isVolunteer?: boolean;
      whatsappLink?: string | null;
      order?: number;
      startsAt?: Date | null;
      endsAt?: Date | null;
      withTime?: boolean;
    } = {};

    if (title !== undefined) data.title = title;
    if (description !== undefined) data.description = description;
    if (period !== undefined) data.period = period?.trim() || null;
    if (capacity !== undefined) data.capacity = capacity;
    if (isOpen !== undefined) data.isOpen = !!isOpen;
    if (autoApprove !== undefined) data.autoApprove = !!autoApprove;
    if (photo !== undefined) data.photo = photo;
    if (isTournament !== undefined) data.isTournament = !!isTournament;
    if (format !== undefined) {
      const played = await prisma.match.count({ where: { activityId: id } });
      if (played > 0 && format !== existing.format) {
        return NextResponse.json({ error: tournament.formatLocked }, { status: 409 });
      }
      data.format = format ?? null;
    }
    if (teamSize !== undefined) {
      const played = await prisma.match.count({ where: { activityId: id } });
      if (played > 0) {
        return NextResponse.json({ error: tournament.teamSizeLocked }, { status: 409 });
      }
      data.teamSize = normalizeTeamSize(teamSize);
    }
    if (profile !== undefined) {
      const played = await prisma.match.count({ where: { activityId: id } });
      if (played > 0 && profile !== existing.profile) {
        return NextResponse.json({ error: tournament.profileLocked }, { status: 409 });
      }
      data.profile = profile;
    }
    if (yellowsForBan !== undefined) data.yellowsForBan = yellowsForBan;
    if (redBanMatches !== undefined) data.redBanMatches = redBanMatches;
    if (isVolunteer !== undefined) data.isVolunteer = !!isVolunteer;
    if (whatsappLink !== undefined) data.whatsappLink = whatsappLink?.trim() || null;
    if (order !== undefined) data.order = Number(order);
    if (startsAt !== undefined) data.startsAt = startsAt;
    if (endsAt !== undefined) data.endsAt = endsAt;
    if (withTime !== undefined) data.withTime = !!withTime;

    const nextIsTournament = data.isTournament ?? existing.isTournament;
    const nextIsVolunteer = data.isVolunteer ?? existing.isVolunteer;
    if (nextIsTournament && nextIsVolunteer) {
      return NextResponse.json({ error: activities.tournamentAndVolunteer }, { status: 400 });
    }
    const nextWhatsappLink =
      data.whatsappLink !== undefined ? data.whatsappLink : existing.whatsappLink;
    if (nextIsVolunteer && !/^https?:\/\//.test(nextWhatsappLink || "")) {
      return NextResponse.json({ error: activities.whatsappRequired }, { status: 400 });
    }

    const activity = await prisma.activity.update({ where: { id }, data });
    await logAction(session.username, "UPDATE_ACTIVITY", activity.title, {
      ...auditContext(session, req),
      targetType: "Activity",
      targetId: activity.id,
      before: existing,
      after: {
        title: activity.title,
        period: activity.period,
        capacity: activity.capacity,
        isOpen: activity.isOpen,
        autoApprove: activity.autoApprove,
        isTournament: activity.isTournament,
        format: activity.format,
        isVolunteer: activity.isVolunteer,
        whatsappLink: activity.whatsappLink,
        startsAt: activity.startsAt,
        endsAt: activity.endsAt,
        withTime: activity.withTime,
      },
    });

    return NextResponse.json({ activity });
  },
);

export const DELETE = withRoute(
  "DELETE /api/admin/activities/[id]",
  async (req: NextRequest, { params }: { params: Promise<{ id: string }> }) => {
    const { id } = await params;
    const session = await requireActivityAccess(id);

    const activity = await prisma.activity.findUnique({ where: { id } });
    if (!activity) {
      return NextResponse.json({ error: activities.notFound }, { status: 404 });
    }

    await prisma.activity.delete({ where: { id } });
    await logAction(session.username, "DELETE_ACTIVITY", activity.title, {
      ...auditContext(session, req),
      targetType: "Activity",
      targetId: id,
      before: activity,
    });

    return NextResponse.json({ ok: true });
  },
);
