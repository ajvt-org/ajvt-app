import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getUserSession } from "@/lib/auth";
import { formatActivityDates } from "@/lib/activityDates";
import { LANDING_SECTIONS } from "@/lib/navigation";
import LandingHero from "@/components/LandingHero";
import LandingActivities from "@/components/LandingActivities";
import MemberTabs from "@/components/MemberTabs";

// The page is the list of sections in LANDING_SECTIONS, in that order. Hiding
// one or swapping two is an edit to that array.
//
// It is also the manifest's start_url, so the installed app reopens here every
// time. Someone already signed in is sent on rather than shown the two doors
// again, which read as being logged out.
export default async function LandingPage() {
  const wantsActivities = LANDING_SECTIONS.includes("activities");
  const [session, rows] = await Promise.all([
    getUserSession(),
    // Only queried when a section actually renders it, so dropping
    // "activities" from the list drops the query with it.
    wantsActivities
      ? prisma.activity.findMany({
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
        })
      : Promise.resolve([]),
  ]);

  if (session) redirect("/home");

  const activities = rows.map((a) => ({
    id: a.id,
    title: a.title,
    when: formatActivityDates(a),
    photo: a.photo,
    isVolunteer: a.isVolunteer,
  }));

  return (
    <>
      <div className="app-shell">
        {LANDING_SECTIONS.map((section) =>
          section === "hero" ? (
            <LandingHero key={section} />
          ) : (
            <LandingActivities key={section} activities={activities} />
          ),
        )}
      </div>
      <MemberTabs signedIn={false} />
    </>
  );
}
