import { prisma } from "@/lib/prisma";
import { formatActivityDates } from "@/lib/activityDates";
import LandingActivities from "@/components/LandingActivities";
import PageHeader from "@/components/PageHeader";
import { landingActivities as texts } from "@/lib/texts";

export default async function ActivitiesPage() {
  const rows = await prisma.activity.findMany({
    orderBy: [{ isOpen: "desc" }, { order: "asc" }],
    select: {
      id: true,
      title: true,
      period: true,
      startsAt: true,
      endsAt: true,
      withTime: true,
      photo: true,
      isVolunteer: true,
      isOpen: true,
    },
  });

  return (
    <div className="app-shell">
      <PageHeader title={texts.pageTitle} />
      <LandingActivities
        heading={false}
        activities={rows.map((a) => ({
          id: a.id,
          title: a.title,
          when: formatActivityDates(a),
          startsAt: a.startsAt,
          endsAt: a.endsAt,
          photo: a.photo,
          isVolunteer: a.isVolunteer,
          isOpen: a.isOpen,
        }))}
      />
    </div>
  );
}
