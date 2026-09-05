import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { nameOf } from "@/lib/person";
import { STANDING_MATCH_SELECT, matchStanding } from "@/lib/activityMatches";
import { requireAdmin, requireAdminRole } from "@/lib/auth";
import { scopedActivityIds } from "@/lib/activityAccessServer";
import { logAction, auditContext } from "@/lib/audit";
import { withRoute } from "@/lib/route";
import { normalizeTeamSize } from "@/lib/teamSize";
import { parse } from "@/lib/validation";
import { activityCreateSchema } from "./schema";
import { activities } from "@/lib/messages";
import { ForbiddenError } from "@/lib/errors";
import { seesEveryActivity } from "@/lib/activityAccess";

export const GET = withRoute("GET /api/admin/activities", async () => {
  const session = await requireAdmin();
  const scoped = await scopedActivityIds(session);
  if (scoped === null && !seesEveryActivity(session.role)) {
    throw new ForbiddenError();
  }

  const activities = await prisma.activity.findMany({
    where: scoped ? { id: { in: scoped } } : {},
    orderBy: { order: "asc" },
    include: {
      registrations: {
        select: {
          id: true,
          status: true,
          paymentProof: true,
          rejectionReason: true,
          createdAt: true,
          userId: true,
          user: {
            select: { phone: true, fullName: true, age: true },
          },
        },
        orderBy: { createdAt: "asc" },
      },
      teams: {
        select: { _count: { select: { members: { where: { status: "PENDING" } } } } },
      },
      matches: { select: STANDING_MATCH_SELECT },
    },
  });

  return NextResponse.json({
    activities: activities.map(({ teams, matches, registrations, ...activity }) => ({
      ...activity,
      ...matchStanding(matches, activity.isTournament),
      registrations: registrations.map(({ user, userId, ...registration }) => ({
        ...registration,
        member: {
          id: userId,
          fullName: nameOf(user),
          phone: user.phone,
          age: user.age ?? "",
        },
      })),
      pendingJoinRequests: teams.reduce((sum, team) => sum + team._count.members, 0),
    })),
  });
});

export const POST = withRoute("POST /api/admin/activities", async (req: NextRequest) => {
  const session = await requireAdminRole("ACTIVITIES");
  const {
    title,
    description,
    period,
    capacity,
    photo,
    isTournament,
    format,
    profile,
    minTeamSize,
    maxTeamSize,
    isVolunteer,
    whatsappLink,
    startsAt,
    endsAt,
    withTime,
  } = parse(activityCreateSchema, await req.json());

  if (isTournament && isVolunteer) {
    return NextResponse.json({ error: activities.tournamentAndVolunteer }, { status: 400 });
  }
  if (isVolunteer && !/^https?:\/\//.test(whatsappLink?.trim() || "")) {
    return NextResponse.json({ error: activities.whatsappRequired }, { status: 400 });
  }

  const { _max } = await prisma.activity.aggregate({ _max: { order: true } });

  const activity = await prisma.activity.create({
    data: {
      title,
      description,
      period: period?.trim() || null,
      startsAt: startsAt ?? null,
      endsAt: endsAt ?? null,
      withTime: !!withTime,
      photo: photo || null,
      capacity: capacity ?? null,
      isTournament: !!isTournament,
      format: isTournament ? (format ?? "KNOCKOUT") : null,
      profile: profile ?? "FOOTBALL",
      minTeamSize: isTournament ? normalizeTeamSize(minTeamSize) : null,
      maxTeamSize: isTournament ? normalizeTeamSize(maxTeamSize) : null,
      isVolunteer: !!isVolunteer,
      whatsappLink: isVolunteer ? whatsappLink!.trim() : null,
      published: false,
      order: (_max.order ?? -1) + 1,
    },
  });

  await logAction(session.username, "CREATE_ACTIVITY", activity.title, {
    ...auditContext(session, req),
    targetType: "Activity",
    targetId: activity.id,
    after: {
      title: activity.title,
      period: activity.period,
      capacity: activity.capacity,
      isTournament: activity.isTournament,
      format: activity.format,
      isVolunteer: activity.isVolunteer,
      startsAt: activity.startsAt,
      endsAt: activity.endsAt,
      withTime: activity.withTime,
    },
  });

  return NextResponse.json({ activity }, { status: 201 });
});
