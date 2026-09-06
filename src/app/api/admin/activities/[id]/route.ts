import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireActivityAccess } from "@/lib/activityAccessServer";
import { logAction, auditContext } from "@/lib/audit";
import { withRoute } from "@/lib/route";
import { normalizePlayerCount } from "@/lib/squadSize";
import { PLAYED_MATCH } from "@/lib/activityMatches";
import { parse } from "@/lib/validation";
import { activityUpdateSchema } from "./schema";
import { activities, entrantWording, tournament } from "@/lib/messages";
import { entrantOf } from "@/lib/entrantServer";
import { reconcileSeats } from "@/lib/registrationTeamServer";
import type { MatchShape, TournamentFormat } from "@prisma/client";

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
        matchShape: true,
        minTeamSize: true,
        maxTeamSize: true,
        organisedByHomeVillage: true,
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
      matchShape,
      minTeamSize,
      maxTeamSize,
      organisedByHomeVillage,
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

    const fixtureCount = () => prisma.match.count({ where: { activityId: id } });
    const playedCount = () => prisma.match.count({ where: { activityId: id, ...PLAYED_MATCH } });

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
      matchShape?: MatchShape;
      minTeamSize?: number | null;
      maxTeamSize?: number | null;
      organisedByHomeVillage?: boolean;
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
      if (format !== existing.format && (await fixtureCount()) > 0) {
        return NextResponse.json({ error: tournament.formatLocked }, { status: 409 });
      }
      data.format = format ?? null;
    }
    if (minTeamSize !== undefined || maxTeamSize !== undefined) {
      const nextMinTeamSize =
        minTeamSize !== undefined ? normalizePlayerCount(minTeamSize) : existing.minTeamSize;
      const nextMaxTeamSize =
        maxTeamSize !== undefined ? normalizePlayerCount(maxTeamSize) : existing.maxTeamSize;
      const moved =
        nextMinTeamSize !== existing.minTeamSize || nextMaxTeamSize !== existing.maxTeamSize;
      if (moved && (await playedCount()) > 0) {
        return NextResponse.json(
          { error: entrantWording(entrantOf(existing)).squadSizeLocked },
          { status: 409 },
        );
      }
      if (minTeamSize !== undefined) data.minTeamSize = nextMinTeamSize;
      if (maxTeamSize !== undefined) data.maxTeamSize = nextMaxTeamSize;
    }
    if (organisedByHomeVillage !== undefined) {
      data.organisedByHomeVillage = !!organisedByHomeVillage;
    }
    if (outsidePlayerLimit !== undefined) {
      data.outsidePlayerLimit = normalizePlayerCount(outsidePlayerLimit);
    }
    if (matchShape !== undefined) {
      if (matchShape !== existing.matchShape && (await fixtureCount()) > 0) {
        return NextResponse.json({ error: tournament.matchShapeLocked }, { status: 409 });
      }
      data.matchShape = matchShape;
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

    const reshaped =
      data.isTournament !== undefined ||
      data.minTeamSize !== undefined ||
      data.maxTeamSize !== undefined;

    const activity = await prisma.$transaction(async (tx) => {
      if (settled) {
        await tx.activityRegistration.updateMany({
          where: { activityId: id, status: "PENDING" },
          data: { status: settled },
        });
      }
      const updated = await tx.activity.update({ where: { id }, data });
      if (reshaped || settled) await reconcileSeats(tx, id);
      return updated;
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
