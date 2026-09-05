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
        minTeamSize: true,
        maxTeamSize: true,
        organisedByTaguilalett: true,
        outsidePlayerLimit: true,
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
      showScorersAndCards,
      format,
      profile,
      minTeamSize,
      maxTeamSize,
      organisedByTaguilalett,
      outsidePlayerLimit,
      yellowsForBan,
      redBanMatches,
      mvpVoteMinutes,
      isVolunteer,
      published,
      settlePending,
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
      showScorersAndCards?: boolean;
      format?: TournamentFormat | null;
      profile?: SportProfile;
      minTeamSize?: number | null;
      maxTeamSize?: number | null;
      organisedByTaguilalett?: boolean;
      outsidePlayerLimit?: number | null;
      yellowsForBan?: number;
      redBanMatches?: number;
      mvpVoteMinutes?: number;
      isVolunteer?: boolean;
      published?: boolean;
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
    if (showScorersAndCards !== undefined) data.showScorersAndCards = !!showScorersAndCards;
    if (format !== undefined) {
      const played = await prisma.match.count({ where: { activityId: id } });
      if (played > 0 && format !== existing.format) {
        return NextResponse.json({ error: tournament.formatLocked }, { status: 409 });
      }
      data.format = format ?? null;
    }
    if (minTeamSize !== undefined || maxTeamSize !== undefined) {
      const played = await prisma.match.count({ where: { activityId: id } });
      if (played > 0) {
        return NextResponse.json({ error: tournament.teamSizeLocked }, { status: 409 });
      }
      if (minTeamSize !== undefined) data.minTeamSize = normalizeTeamSize(minTeamSize);
      if (maxTeamSize !== undefined) data.maxTeamSize = normalizeTeamSize(maxTeamSize);
    }
    if (organisedByTaguilalett !== undefined) {
      data.organisedByTaguilalett = !!organisedByTaguilalett;
    }
    if (outsidePlayerLimit !== undefined) {
      data.outsidePlayerLimit = normalizeTeamSize(outsidePlayerLimit);
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
    if (mvpVoteMinutes !== undefined) data.mvpVoteMinutes = mvpVoteMinutes;
    if (isVolunteer !== undefined) data.isVolunteer = !!isVolunteer;
    if (published !== undefined) data.published = !!published;
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

    const pending =
      nextIsVolunteer && !existing.isVolunteer
        ? await prisma.activityRegistration.count({ where: { activityId: id, status: "PENDING" } })
        : 0;
    if (pending > 0 && !settlePending) {
      return NextResponse.json(
        { error: activities.pendingBeforeCampaign, pending },
        { status: 409 },
      );
    }
    const settled = pending > 0 ? (settlePending === "accept" ? "ACTIVE" : "REJECTED") : null;

    const activity = await prisma.$transaction(async (tx) => {
      if (settled) {
        await tx.activityRegistration.updateMany({
          where: { activityId: id, status: "PENDING" },
          data: { status: settled },
        });
      }
      return tx.activity.update({ where: { id }, data });
    });
    if (published !== undefined && !!published !== existing.published) {
      await logAction(
        session.username,
        published ? "PUBLISH_ACTIVITY" : "UNPUBLISH_ACTIVITY",
        activity.title,
        {
          ...auditContext(session, req),
          targetType: "Activity",
          targetId: activity.id,
          before: { published: existing.published },
          after: { published: !!published },
        },
      );
    }
    if (isOpen !== undefined && !!isOpen !== existing.isOpen) {
      await logAction(
        session.username,
        isOpen ? "OPEN_ACTIVITY_REGISTRATION" : "CLOSE_ACTIVITY_REGISTRATION",
        activity.title,
        {
          ...auditContext(session, req),
          targetType: "Activity",
          targetId: activity.id,
          before: { isOpen: existing.isOpen },
          after: { isOpen: !!isOpen },
        },
      );
    }
    if (settled) {
      await logAction(
        session.username,
        settled === "ACTIVE" ? "APPROVE_ACTIVITY_REGISTRATION" : "REJECT_ACTIVITY_REGISTRATION",
        `${activity.title} — ${pending}`,
        {
          ...auditContext(session, req),
          targetType: "Activity",
          targetId: activity.id,
          before: { pendingRegistrations: pending },
          after: { status: settled },
        },
      );
    }
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
        showScorersAndCards: activity.showScorersAndCards,
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
