import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getUserSession } from "@/lib/auth";
import PageHeader from "@/components/PageHeader";
import Icon from "@/components/Icon";
import NumericRanges from "@/components/NumericRanges";
import TodayBand from "@/components/tournament/TodayBand";
import TournamentTabs from "@/components/tournament/TournamentTabs";
import { formatActivityDates } from "@/lib/activityDates";
import { activityPage as texts, publicTournament as tournamentTexts } from "@/lib/texts";
import ActivityHero from "./ActivityHero";
import ActivityStatus from "./ActivityStatus";
import { entrantKind } from "@/lib/entrant";
import { loadActivityPage } from "./activityQuery";
import { tournamentPanels } from "./tournamentPanels";

export const dynamic = "force-dynamic";

export default async function ActivityPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const activity = await loadActivityPage(id);
  if (!activity) notFound();

  const session = await getUserSession();
  const userId = session ? (session as { userId: string }).userId : null;
  const voteIds = activity.matches.map((m) => m.mvpVote?.id).filter((v): v is string => !!v);
  const myVotes =
    userId && voteIds.length > 0
      ? await prisma.mvpVote.findMany({
          where: { userId, voteId: { in: voteIds } },
          select: { voteId: true, candidateId: true },
        })
      : [];
  const myVoteByVoteId = new Map(myVotes.map((v) => [v.voteId, v.candidateId]));

  const when = formatActivityDates(activity);
  const registrantCount = activity._count.registrations;
  const tournament = activity.isTournament
    ? await tournamentPanels(activity, userId, myVoteByVoteId)
    : null;

  return (
    <div className="app-shell">
      <PageHeader title={activity.title} backHref={userId ? "/home" : "/activities"} />

      <ActivityHero
        title={activity.title}
        photo={activity.photo}
        isVolunteer={activity.isVolunteer}
        isOpen={activity.isOpen}
      />

      <div className="px-5 py-5 space-y-4">
        {(when || activity.capacity !== null) && (
          <div className="space-y-2">
            <div
              className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm"
              style={{ color: "var(--text-muted)" }}
            >
              {when && (
                <span className="flex items-center gap-1.5">
                  <Icon name="calendar" size={14} className="icon-optical" />
                  <NumericRanges>{when}</NumericRanges>
                </span>
              )}
              {activity.capacity !== null && (
                <span className="flex items-center gap-1.5">
                  <Icon name="users" size={14} className="icon-optical" />
                  {registrantCount} / {activity.capacity} {texts.participants}
                </span>
              )}
            </div>

            {activity.capacity !== null && (
              <div className="capacity-bar" aria-hidden="true">
                <span
                  style={{
                    width: `${Math.min(100, Math.round((registrantCount / activity.capacity) * 100))}%`,
                  }}
                />
              </div>
            )}
          </div>
        )}

        {activity.description && (
          <p className="text-sm" style={{ color: "var(--text-main)", lineHeight: 1.8 }}>
            {activity.description}
          </p>
        )}

        <div className="pt-1" style={{ borderTop: "1px solid var(--mint-100)" }}>
          <div className="pt-3">
            <ActivityStatus
              activity={{
                id: activity.id,
                title: activity.title,
                description: activity.description,
                when,
                startsAt: activity.startsAt ? activity.startsAt.toISOString() : null,
                endsAt: activity.endsAt ? activity.endsAt.toISOString() : null,
                photo: activity.photo,
                capacity: activity.capacity,
                isOpen: activity.isOpen,
                isTournament: activity.isTournament,
                isVolunteer: activity.isVolunteer,
                whatsappLink: activity.whatsappLink,
                registrantCount,
                teams: activity.teams.map((t) => ({ id: t.id, name: t.name })),
              }}
            />
          </div>
        </div>

        {tournament &&
          (activity.teams.length === 0 ? (
            <p className="text-sm text-center py-8" style={{ color: "var(--text-muted)" }}>
              {tournamentTexts.entrant[entrantKind(activity.teamSize)].noneYet}
            </p>
          ) : (
            <div className="space-y-5 pt-1">
              {tournament.todayMatches.length > 0 && (
                <TodayBand matches={tournament.todayMatches} />
              )}
              <TournamentTabs panels={tournament.panels} />
            </div>
          ))}
      </div>
    </div>
  );
}
