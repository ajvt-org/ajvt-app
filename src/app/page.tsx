import { prisma } from "@/lib/prisma";
import { getUserSession } from "@/lib/auth";
import { formatActivityDates } from "@/lib/activityDates";
import { LANDING_SECTIONS } from "@/lib/navigation";
import LandingHero from "@/components/LandingHero";
import LandingActivities from "@/components/LandingActivities";
import MemberTabs from "@/components/MemberTabs";

// The page is the list of sections in LANDING_SECTIONS, in that order. Hiding
// one or swapping two is an edit to that array.
export default async function LandingPage() {
  const [session, rows] = await Promise.all([
    getUserSession(),
    prisma.activity.findMany({
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
    }),
  ]);

  const activities = rows.map((a) => ({
    id: a.id,
    title: a.title,
    when: formatActivityDates(a),
    photo: a.photo,
    isVolunteer: a.isVolunteer,
  }));

  return (
    <div className="app-shell">
      {LANDING_SECTIONS.map((section) =>
        section === "hero" ? (
          <LandingHero key={section} activityCount={activities.length} />
        ) : (
          <LandingActivities key={section} activities={activities} />
        ),
      )}
      <MemberTabs signedIn={Boolean(session)} />
    </div>
  );
}
