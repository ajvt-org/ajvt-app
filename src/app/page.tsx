import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { STANDING_MATCH_SELECT, matchStanding } from "@/lib/activityMatches";
import { getUserSession } from "@/lib/auth";
import { formatActivityDates } from "@/lib/activityDates";
import { sortActivities } from "@/lib/activityOrder";
import { LANDING_SECTIONS } from "@/lib/navigation";
import LandingHero from "@/components/LandingHero";
import LandingActivities from "@/components/LandingActivities";
import MemberTabs from "@/components/MemberTabs";

export default async function LandingPage() {
  const wantsActivities = LANDING_SECTIONS.includes("activities");
  const [session, rows] = await Promise.all([
    getUserSession(),
    wantsActivities
      ? prisma.activity.findMany({
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
        })
      : Promise.resolve([]),
  ]);

  if (session) redirect("/home");

  const activities = sortActivities(
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
  }));

  return (
    <>
      <div className="app-shell">
        {LANDING_SECTIONS.map((section) =>
          section === "hero" ? (
            <LandingHero key={section} />
          ) : (
            <LandingActivities key={section} activities={activities} from="/" />
          ),
        )}
      </div>
      <MemberTabs signedIn={false} />
    </>
  );
}
