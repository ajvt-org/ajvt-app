import { prisma } from "@/lib/prisma";
import { formatActivityDates } from "@/lib/activityDates";
import LandingActivities from "@/components/LandingActivities";

// The activities tab for someone with no account. A signed-in member gets
// /home instead, which knows what they are registered for.
export default async function ActivitiesPage() {
  const rows = await prisma.activity.findMany({
    where: { isOpen: true },
    orderBy: { order: "asc" },
    select: {
      id: true,
      title: true,
      period: true,
      startsAt: true,
      endsAt: true,
      withTime: true,
      photo: true,
      isVolunteer: true,
    },
  });

  return (
    <div className="app-shell">
      <LandingActivities
        activities={rows.map((a) => ({
          id: a.id,
          title: a.title,
          when: formatActivityDates(a),
          photo: a.photo,
          isVolunteer: a.isVolunteer,
        }))}
      />
    </div>
  );
}
