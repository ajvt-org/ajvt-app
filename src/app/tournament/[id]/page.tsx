import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getUserSession } from "@/lib/auth";
import {
  groupStandings,
  computeTopScorers,
  computeStats,
  computeDisciplineStats,
  computeCleanSheets,
  computeMotmLeaders,
  computeTeamAdvancedStats,
  matchDateKey,
  todayClubDateKey,
} from "@/lib/tournament";
import BracketTree from "@/components/tournament/BracketTree";
import CardChip from "@/components/tournament/CardChip";
import MatchDayList from "@/components/tournament/MatchDayList";
import MatchFixture from "@/components/tournament/MatchFixture";
import MatchResult from "@/components/tournament/MatchResult";
import RankedList from "@/components/tournament/RankedList";
import StandingsTable from "@/components/tournament/StandingsTable";
import TeamFormList from "@/components/tournament/TeamFormList";
import TeamsGrid from "@/components/tournament/TeamsGrid";
import TodayBand from "@/components/tournament/TodayBand";
import TournamentSection from "@/components/tournament/TournamentSection";
import TournamentSummary from "@/components/tournament/TournamentSummary";
import TournamentTabs, { type TournamentPanel } from "@/components/tournament/TournamentTabs";
import PageHeader from "@/components/PageHeader";
import NumericRanges from "@/components/NumericRanges";
import Icon from "@/components/Icon";
import { formatActivityDates } from "@/lib/activityDates";
import { discipline as disciplineTexts, publicTournament as texts } from "@/lib/texts";
import { suspendedMemberIds } from "@/lib/suspensionServer";
import type { PublicMatch } from "@/components/tournament/publicTypes";

export const dynamic = "force-dynamic";

export default async function PublicTournamentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const activity = await prisma.activity.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      description: true,
      period: true,
      startsAt: true,
      endsAt: true,
      withTime: true,
      profile: true,
      teamSize: true,
      isTournament: true,
      groups: { select: { id: true, name: true }, orderBy: { createdAt: "asc" as const } },
      teams: {
        select: {
          id: true,
          name: true,
          logo: true,
          groupId: true,
          members: {
            select: { member: { select: { id: true, fullName: true, photo: true } } },
            orderBy: { member: { fullName: "asc" } },
          },
        },
      },
      matches: {
        orderBy: [{ status: "asc" }, { order: "asc" }, { matchDate: "asc" }, { createdAt: "asc" }],
        select: {
          id: true,
          homeTeam: { select: { id: true, name: true, logo: true } },
          awayTeam: { select: { id: true, name: true, logo: true } },
          matchDate: true,
          round: true,
          venue: true,
          isKnockout: true,
          bracketRound: true,
          order: true,
          homeScore: true,
          awayScore: true,
          homePenalties: true,
          awayPenalties: true,
          status: true,
          manOfTheMatch: { select: { id: true, fullName: true, photo: true } },
          goals: {
            select: {
              count: true,
              minute: true,
              teamId: true,
              kind: true,
              period: true,
              member: { select: { id: true, fullName: true, photo: true } },
            },
          },
          penaltyKicks: {
            orderBy: { order: "asc" as const },
            select: {
              teamId: true,
              order: true,
              scored: true,
              member: { select: { id: true, fullName: true, photo: true } },
            },
          },
          bookings: {
            select: {
              cardType: true,
              minute: true,
              teamId: true,
              member: { select: { id: true, fullName: true, photo: true } },
            },
          },
          mvpVote: {
            select: {
              id: true,
              status: true,
              candidates: {
                select: {
                  id: true,
                  member: { select: { id: true, fullName: true } },
                  _count: { select: { votes: true } },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!activity || !activity.isTournament) {
    notFound();
  }

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

  const matches = activity.matches as PublicMatch[];
  const standingsByGroup = groupStandings(
    activity.teams,
    activity.matches,
    activity.groups.map((g) => g.id),
  );
  const topScorers = computeTopScorers(activity.teams, activity.matches);
  const stats = computeStats(activity.teams, activity.matches);
  const discipline = computeDisciplineStats(activity.teams, activity.matches);
  const cleanSheets = computeCleanSheets(activity.teams, activity.matches);
  const motmLeaders = computeMotmLeaders(activity.teams, activity.matches);
  const teamAdvancedStats = computeTeamAdvancedStats(activity.teams, activity.matches).filter(
    (t) => t.biggestWin || t.form.length > 0,
  );
  const groupNameById = new Map(activity.groups.map((g) => [g.id, g.name]));
  const singleFlatTable = standingsByGroup.length === 1 && standingsByGroup[0].groupId === null;

  const played = matches.filter((m) => m.status === "PLAYED");
  const scheduled = matches.filter((m) => m.status === "SCHEDULED");
  const bracketMatches = activity.matches.filter(
    (m): m is typeof m & { bracketRound: number } => m.bracketRound !== null,
  );
  const todayKey = todayClubDateKey();
  const todayMatches = matches
    .filter((m) => m.matchDate && matchDateKey(m.matchDate) === todayKey)
    .sort((a, b) => new Date(a.matchDate!).getTime() - new Date(b.matchDate!).getTime());

  const board = activity.profile === "BOARD";
  const suspended =
    !board && discipline.length > 0 ? await suspendedMemberIds(activity.id) : new Set<string>();
  const singles = activity.teamSize === 1;
  const participantsLabel = singles ? texts.players : texts.teams;
  const hasStats = board
    ? teamAdvancedStats.length > 0
    : topScorers.length > 0 ||
      discipline.length > 0 ||
      cleanSheets.length > 0 ||
      motmLeaders.length > 0 ||
      teamAdvancedStats.length > 0;

  // A knockout match counts towards nobody's points, so a cup with no group
  // stage would open on a table of zeros for every team. It leads with the
  // bracket instead. A tournament with neither still shows the table, which
  // is the only thing that says who is in which group.
  const hasLeagueStage = matches.some((m) => !m.isKnockout) || activity.groups.length > 0;
  const bracket = (
    <div className="card p-3">
      <BracketTree
        matches={bracketMatches.map((m) => ({
          ...m,
          status: m.status as "SCHEDULED" | "PLAYED",
        }))}
      />
    </div>
  );

  const panels: TournamentPanel[] = [
    hasLeagueStage || bracketMatches.length === 0
      ? {
          key: "standings",
          label: texts.standings,
          icon: "trophy",
          content: (
            <>
              {standingsByGroup.map((group) => (
                <StandingsTable
                  key={group.groupId ?? "none"}
                  title={
                    singleFlatTable
                      ? null
                      : group.groupId
                        ? groupNameById.get(group.groupId) || texts.group
                        : texts.noGroup
                  }
                  rows={group.standings}
                  showFollow={!!userId}
                />
              ))}
              {bracketMatches.length > 0 && (
                <TournamentSection icon="target" title={texts.bracket}>
                  {bracket}
                </TournamentSection>
              )}
            </>
          ),
        }
      : { key: "bracket", label: texts.bracket, icon: "target", content: bracket },
    {
      key: "matches",
      label: texts.matches,
      icon: "calendar",
      content: (
        <>
          {scheduled.length === 0 && played.length === 0 && (
            <p className="text-sm text-center py-8" style={{ color: "var(--text-muted)" }}>
              {texts.noMatchesYet}
            </p>
          )}
          {scheduled.length > 0 && (
            <TournamentSection icon="calendar" title={texts.upcoming}>
              <MatchDayList
                matches={scheduled}
                renderMatch={(match, day) => (
                  <MatchFixture key={match.id} match={match} day={day} />
                )}
              />
            </TournamentSection>
          )}
          {played.length > 0 && (
            <TournamentSection icon="check" title={texts.results}>
              <MatchDayList
                matches={played}
                renderMatch={(match, day) => (
                  <MatchResult
                    key={match.id}
                    match={match}
                    day={day}
                    allMatches={matches}
                    football={!board}
                    tournamentTitle={activity.title}
                    loggedIn={!!userId}
                    myVoteCandidateId={
                      match.mvpVote ? (myVoteByVoteId.get(match.mvpVote.id) ?? null) : null
                    }
                  />
                )}
              />
            </TournamentSection>
          )}
        </>
      ),
    },
    {
      key: "teams",
      label: participantsLabel,
      icon: "users",
      content: <TeamsGrid teams={activity.teams} />,
    },
  ];

  if (hasStats) {
    const statPanels: TournamentPanel[] = [];
    if (!board && topScorers.length > 0) {
      statPanels.push({
        key: "scorers",
        label: texts.scorers,
        icon: "ball",
        content: (
          <RankedList
            rows={topScorers.map((s) => ({
              id: s.memberId,
              name: s.fullName,
              photo: s.photo,
              sub: s.teamName,
              value: (
                <>
                  <Icon name="ball" size={14} className="icon-inline" /> {s.goals}
                </>
              ),
            }))}
          />
        ),
      });
    }
    if (!board && discipline.length > 0) {
      statPanels.push({
        key: "discipline",
        label: texts.discipline,
        icon: "flag",
        content: (
          <RankedList
            rows={discipline.map((d) => ({
              id: d.memberId,
              name: d.fullName,
              photo: d.photo,
              sub: d.teamName,
              badge: suspended.has(d.memberId) ? disciplineTexts.suspendedBadge : undefined,
              value: (
                <span className="flex items-center gap-2">
                  {d.yellow > 0 && <CardChip type="YELLOW" count={d.yellow} />}
                  {d.red > 0 && <CardChip type="RED" count={d.red} />}
                </span>
              ),
            }))}
          />
        ),
      });
    }
    if (!board && cleanSheets.length > 0) {
      statPanels.push({
        key: "defence",
        label: texts.defence,
        icon: "shield",
        content: (
          <RankedList
            rows={cleanSheets.map((c) => ({
              id: c.teamId,
              name: c.name,
              avatar: false,
              value: (
                <span dir="ltr">
                  {c.cleanSheets}/{c.played}
                </span>
              ),
            }))}
          />
        ),
      });
    }
    if (!board && motmLeaders.length > 0) {
      statPanels.push({
        key: "motm",
        label: texts.motm,
        icon: "star",
        content: (
          <RankedList
            rows={motmLeaders.map((m) => ({
              id: m.memberId,
              name: m.fullName,
              photo: m.photo,
              sub: m.teamName,
              value: (
                <>
                  <Icon name="star" size={14} className="icon-inline" filled /> {m.count}
                </>
              ),
            }))}
          />
        ),
      });
    }
    if (teamAdvancedStats.length > 0) {
      statPanels.push({
        key: "teamStats",
        label: participantsLabel,
        icon: "chart",
        content: <TeamFormList teams={teamAdvancedStats} />,
      });
    }

    panels.push({
      key: "stats",
      label: texts.stats,
      icon: "chart",
      content: (
        <>
          {!board && (
            <TournamentSummary
              matchesPlayed={stats.matchesPlayed}
              totalGoals={stats.totalGoals}
              avgGoalsPerMatch={stats.avgGoalsPerMatch}
              bestAttack={
                stats.bestAttack ? `${stats.bestAttack.name} (${stats.bestAttack.gf})` : "\u2014"
              }
            />
          )}
          <TournamentTabs panels={statPanels} variant="sub" />
        </>
      ),
    });
  }

  return (
    <div className="app-shell">
      {/* The only way in is the activity's own page, and a tournament carries
          the activity's id, so back goes where the visitor actually came
          from rather than to whichever home their session implies. */}
      <PageHeader title={activity.title} backHref={`/activities/${id}`} />

      <div className="flex-1 px-5 py-6 space-y-5">
        {activity.description && (
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            {activity.description}
          </p>
        )}
        {formatActivityDates(activity) && (
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            <Icon name="calendar" size={13} className="icon-inline" />{" "}
            <NumericRanges>{formatActivityDates(activity)!}</NumericRanges>
          </p>
        )}

        {activity.teams.length === 0 ? (
          <p className="text-sm text-center py-8" style={{ color: "var(--text-muted)" }}>
            {singles ? texts.noPlayersYet : texts.noTeamsYet}
          </p>
        ) : (
          <>
            {todayMatches.length > 0 && <TodayBand matches={todayMatches} />}
            <TournamentTabs panels={panels} />
          </>
        )}
      </div>
    </div>
  );
}
