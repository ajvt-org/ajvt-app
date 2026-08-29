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
import type { PublicMatch } from "./publicTypes";
import { matchDisplay } from "@/lib/texts";

export default function MatchResult({
  match,
  day,
  allMatches,
  football = true,
  showScorersAndCards = true,
  tournamentTitle,
  loggedIn,
  myVoteCandidateId,
  manOfTheMatchTeam = null,
}: {
  match: PublicMatch;
  day: { round: string | null; venue: string | null };
  allMatches: PublicMatch[];
  football?: boolean;
  showScorersAndCards?: boolean;
  tournamentTitle: string;
  loggedIn: boolean;
  myVoteCandidateId: string | null;
  manOfTheMatchTeam?: string | null;
}) {
  const round = day.round ? null : match.round;
  const venue = day.venue ? null : match.venue;
  const priorMeetings = getHeadToHead(allMatches, match.homeTeam.id, match.awayTeam.id, match.id);
  const hideGoalsOfTeamId = match.forfeitWinnerTeamId
    ? forfeitLoserTeamId(match.forfeitWinnerTeamId, match.homeTeam.id, match.awayTeam.id)
    : null;
  const eventRows = matchEventRows({
    ...match,
    homeTeamId: match.homeTeam.id,
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
        home={{ name: match.homeTeam.name, logo: match.homeTeam.logo }}
        away={{ name: match.awayTeam.name, logo: match.awayTeam.logo }}
        score={{ home: match.homeScore, away: match.awayScore }}
        layout="stacked"
      />

      {match.forfeitWinnerTeamId && (
        <p className="text-center">
          <span className="badge badge-pending">{matchDisplay.forfeitBadge}</span>
        </p>
      )}

      {football && (
        <>
          <MatchEvents rows={showScorersAndCards ? eventRows : withoutScorersAndCards(eventRows)} />
          <MatchTimeline
            entries={matchTimeline({ ...match, homeTeamId: match.homeTeam.id, hideGoalsOfTeamId })}
            teams={{ home: match.homeTeam.name, away: match.awayTeam.name }}
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
          homeTeamName={match.homeTeam.name}
          awayTeamName={match.awayTeam.name}
          homeTeamLogo={match.homeTeam.logo}
          awayTeamLogo={match.awayTeam.logo}
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
              isHome: g.teamId === match.homeTeam.id,
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
            isHome: b.teamId === match.homeTeam.id,
          }))}
        />
      </MatchCardFooter>
    </div>
  );
}
