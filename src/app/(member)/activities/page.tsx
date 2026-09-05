import { prisma } from "@/lib/prisma";
import { formatActivityDates } from "@/lib/activityDates";
import { sortActivities } from "@/lib/activityOrder";
import { STANDING_MATCH_SELECT, matchStanding } from "@/lib/activityMatches";
import LandingActivities from "@/components/LandingActivities";
import PageHeader from "@/components/PageHeader";
import { landingActivities as texts } from "@/lib/texts";

export default async function ActivitiesPage() {
  const rows = await prisma.activity.findMany({
    where: { published: true },
    orderBy: { order: "asc" },
    select: {
      id: true,
      order: true,
      title: true,
      period: true,
      startsAt: true,
      endsAt: true,
      withTime: true,
      photo: true,
      isVolunteer: true,
      isOpen: true,
      isTournament: true,
      matches: { select: STANDING_MATCH_SELECT },
    },
  });

  return (
    <div className="app-shell">
      <PageHeader title={texts.pageTitle} />
      <LandingActivities
        heading={false}
        activities={sortActivities(
          rows.map((a) => ({ ...a, ...matchStanding(a.matches, a.isTournament) })),
        ).map((a) => ({
          id: a.id,
          title: a.title,
          when: formatActivityDates(a),
          startsAt: a.startsAt,
          endsAt: a.endsAt,
          photo: a.photo,
          isVolunteer: a.isVolunteer,
          isOpen: a.isOpen,
          unplayedMatches: a.unplayedMatches,
          awaitingStage: a.awaitingStage,
        }))}
      />
    </div>
  );
}
