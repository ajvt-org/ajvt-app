import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { withRoute } from "@/lib/route";
import { formatActivityDates } from "@/lib/activityDates";
import { sortActivities } from "@/lib/activityOrder";

export const GET = withRoute("GET /api/activities", async () => {
  const activities = await prisma.activity.findMany({
    where: { published: true },
    orderBy: { order: "asc" },
    select: {
      id: true,
      order: true,
      title: true,
      description: true,
      period: true,
      startsAt: true,
      endsAt: true,
      withTime: true,
      photo: true,
      capacity: true,
      isOpen: true,
      isTournament: true,
      isVolunteer: true,
      whatsappLink: true,
      _count: { select: { registrations: { where: { status: { not: "REJECTED" } } } } },
      teams: { select: { id: true, name: true }, orderBy: { createdAt: "asc" } },
    },
  });

  return NextResponse.json({
    activities: sortActivities(activities).map((a) => ({
      id: a.id,
      title: a.title,
      description: a.description,
      when: formatActivityDates(a),
      startsAt: a.startsAt,
      endsAt: a.endsAt,
      photo: a.photo,
      capacity: a.capacity,
      isOpen: a.isOpen,
      isTournament: a.isTournament,
      isVolunteer: a.isVolunteer,
      whatsappLink: a.whatsappLink,
      registrantCount: a._count.registrations,
      teams: a.isTournament ? a.teams : [],
    })),
  });
});
