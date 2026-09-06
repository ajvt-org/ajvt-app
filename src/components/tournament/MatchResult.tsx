import Scoreline from "./Scoreline";
import MatchTeams from "./matchCard/MatchTeams";
import MatchMeta from "./matchCard/MatchMeta";
import MatchEvents from "./matchCard/MatchEvents";
import MatchTimeline from "./matchCard/MatchTimeline";
import MatchCardHead from "./matchCard/MatchCardHead";
import MatchCardFooter from "./matchCard/MatchCardFooter";
import ShareResultButton from "./ShareResultButton";
import MvpVoteWidget from "./MvpVoteWidget";
import { getHeadToHead } from "@/lib/tournament";
import { matchEventRows, matchTimeline, withoutScorersAndCards } from "@/lib/matchEvents";
import { forfeitLoserTeamId } from "@/lib/forfeit";
import { isVoteClosed } from "@/lib/mvpVote";
import { formatMatchTime } from "@/lib/clubTime";
import type { DecidedMatch, PublicMatch } from "./publicTypes";
import type { EntrantKind } from "@/lib/entrant";
import { matchDisplay } from "@/lib/texts";
import SeriesScoreline from "@/components/admin/tournament/SeriesScoreline";
import { halvesText } from "@/lib/halfPoints";

export default function MatchResult({
  match,
  day,
  allMatches,
  football = true,
  partWord = null,
  showScorersAndCards = true,
  tournamentTitle,
  loggedIn,
  myVoteCandidateId,
  manOfTheMatchTeam = null,
  entrant = "team",
}: {
  match: DecidedMatch;
  day: { round: string | null; venue: string | null };
  allMatches: PublicMatch[];
  football?: boolean;
  partWord?: string | null;
  showScorersAndCards?: boolean;
  tournamentTitle: string;
  loggedIn: boolean;
  myVoteCandidateId: string | null;
  manOfTheMatchTeam?: string | null;
  entrant?: EntrantKind;
}) {
  const round = day.round ? null : match.round;
  const venue = day.venue ? null : match.venue;
  const priorMeetings = getHeadToHead(
    allMatches,
    match.firstTeam.id,
    match.secondTeam.id,
    match.id,
  );
  const hideGoalsOfTeamId = match.forfeitWinnerTeamId
    ? forfeitLoserTeamId(match.forfeitWinnerTeamId, match.firstTeam.id, match.secondTeam.id)
    : null;
  const eventRows = matchEventRows({
    ...match,
    homeTeamId: match.firstTeam.id,
    manOfTheMatchTeam,
    hideGoalsOfTeamId,
  });

  return (
    <div className="card p-4 space-y-2">
      <MatchCardHead time={match.matchDate ? formatMatchTime(match.matchDate) : null}>
        <MatchMeta
          round={round}
          venue={venue}
          penalties={
            match.forfeitWinnerTeamId === null &&
            match.homePenalties !== null &&
            match.awayPenalties !== null
              ? { home: match.homePenalties, away: match.awayPenalties }
              : null
          }
        />
      </MatchCardHead>

      <MatchTeams
        home={{
          name: match.firstTeam.name,
          logo: match.firstTeam.logo,
          photo: match.firstTeam.photo,
        }}
        away={{
          name: match.secondTeam.name,
          logo: match.secondTeam.logo,
          photo: match.secondTeam.photo,
        }}
        score={football ? { home: match.homeScore, away: match.awayScore } : null}
        size="md"
        layout="stacked"
        entrant={entrant}
      />

      {match.series && (
        <div className="flex justify-center">
          <SeriesScoreline parts={match.parts} standing={match.series} partWord={partWord ?? ""} />
        </div>
      )}

      {match.forfeitWinnerTeamId && (
        <p className="text-center">
          <span className="badge badge-pending">{matchDisplay.forfeitBadge}</span>
        </p>
      )}

      {football && (
        <>
          <MatchEvents rows={showScorersAndCards ? eventRows : withoutScorersAndCards(eventRows)} />
          <MatchTimeline
            entries={matchTimeline({ ...match, homeTeamId: match.firstTeam.id, hideGoalsOfTeamId })}
            teams={{ home: match.firstTeam.name, away: match.secondTeam.name }}
          />
        </>
      )}

      {priorMeetings.length > 0 && (
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          {matchDisplay.priorMeetings}{" "}
          {priorMeetings.map((pm, i) => (
            <span key={pm.id}>
              {i > 0 && matchDisplay.meetingSeparator}
              {pm.status === "PLAYED" ? (
                <Scoreline home={pm.homeScore} away={pm.awayScore} />
              ) : (
                matchDisplay.upcomingShort
              )}
            </span>
          ))}
        </p>
      )}

      {football && match.mvpVote && (
        <MvpVoteWidget
          matchId={match.id}
          status={
            isVoteClosed({
              status: match.mvpVote.status as "OPEN" | "CLOSED",
              closesAt: match.mvpVote.closesAt,
            })
              ? "CLOSED"
              : "OPEN"
          }
          closesAt={match.mvpVote.closesAt}
          candidates={match.mvpVote.candidates.map((c) => ({
            id: c.id,
            fullName: c.member.fullName,
            voteCount: c._count.votes,
          }))}
          loggedIn={loggedIn}
          initialMyVoteCandidateId={myVoteCandidateId}
        />
      )}

      <MatchCardFooter>
        <ShareResultButton
          homeTeamName={match.firstTeam.name}
          awayTeamName={match.secondTeam.name}
          homeTeamLogo={match.firstTeam.logo}
          awayTeamLogo={match.secondTeam.logo}
          homeTeamPhoto={match.firstTeam.photo}
          awayTeamPhoto={match.secondTeam.photo}
          entrant={entrant}
          seriesLine={match.series ? halvesText(match.series.sideAHalves) : null}
          seriesAwayLine={match.series ? halvesText(match.series.sideBHalves) : null}
          homeScore={match.homeScore ?? 0}
          awayScore={match.awayScore ?? 0}
          round={match.round}
          tournamentTitle={tournamentTitle}
          goals={(football ? match.goals : [])
            .filter((g) => g.teamId !== hideGoalsOfTeamId)
            .map((g) => ({
              memberId: g.member?.id ?? null,
              fullName: g.member?.fullName ?? matchDisplay.unknownScorer,
              photo: g.member?.photo ?? null,
              count: g.count,
              minute: g.minute,
              kind: g.kind,
              isHome: g.teamId === match.firstTeam.id,
            }))}
          manOfTheMatch={
            football && match.manOfTheMatch
              ? { ...match.manOfTheMatch, team: manOfTheMatchTeam }
              : null
          }
          bookings={(football ? match.bookings : []).map((b) => ({
            memberId: b.member.id,
            fullName: b.member.fullName,
            photo: b.member.photo,
            cardType: b.cardType as "YELLOW" | "RED",
            minute: b.minute,
            isHome: b.teamId === match.firstTeam.id,
          }))}
        />
      </MatchCardFooter>
    </div>
  );
}
