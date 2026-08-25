import Icon from "@/components/Icon";
import PlayerAvatar from "./PlayerAvatar";
import CardChip from "./CardChip";
import Scoreline from "./Scoreline";
import MatchTeams from "./matchCard/MatchTeams";
import MatchMeta from "./matchCard/MatchMeta";
import ShareResultButton from "./ShareResultButton";
import MvpVoteWidget from "./MvpVoteWidget";
import { getHeadToHead } from "@/lib/tournament";
import { formatMatchTime } from "@/lib/clubTime";
import type { PublicMatch } from "./publicTypes";
import { matchDisplay } from "@/lib/texts";

export default function MatchResult({
  match,
  day,
  allMatches,
  football = true,
  tournamentTitle,
  loggedIn,
  myVoteCandidateId,
}: {
  match: PublicMatch;
  day: { round: string | null; venue: string | null };
  allMatches: PublicMatch[];
  football?: boolean;
  tournamentTitle: string;
  loggedIn: boolean;
  myVoteCandidateId: string | null;
}) {
  const round = day.round ? null : match.round;
  const venue = day.venue ? null : match.venue;
  const priorMeetings = getHeadToHead(allMatches, match.homeTeam.id, match.awayTeam.id, match.id);

  return (
    <div className="card p-4 space-y-2">
      <MatchTeams
        home={{ name: match.homeTeam.name, logo: match.homeTeam.logo }}
        away={{ name: match.awayTeam.name, logo: match.awayTeam.logo }}
        score={{ home: match.homeScore, away: match.awayScore }}
      />

      <div className="flex items-center justify-between gap-2">
        <MatchMeta
          time={match.matchDate ? formatMatchTime(match.matchDate) : null}
          round={round}
          venue={venue}
          penalties={
            match.homePenalties !== null && match.awayPenalties !== null
              ? { home: match.homePenalties, away: match.awayPenalties }
              : null
          }
        />

        <ShareResultButton
          homeTeamName={match.homeTeam.name}
          awayTeamName={match.awayTeam.name}
          homeTeamLogo={match.homeTeam.logo}
          awayTeamLogo={match.awayTeam.logo}
          homeScore={match.homeScore ?? 0}
          awayScore={match.awayScore ?? 0}
          round={match.round}
          tournamentTitle={tournamentTitle}
          goals={(football ? match.goals : []).map((g) => ({
            fullName: g.member?.fullName ?? matchDisplay.unknownScorer,
            photo: g.member?.photo ?? null,
            count: g.count,
            minute: g.minute,
            isHome: g.teamId === match.homeTeam.id,
          }))}
          bookings={(football ? match.bookings : []).map((b) => ({
            fullName: b.member.fullName,
            photo: b.member.photo,
            cardType: b.cardType as "YELLOW" | "RED",
            minute: b.minute,
            isHome: b.teamId === match.homeTeam.id,
          }))}
        />
      </div>

      {football && match.goals.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {match.goals.map((goal, i) => (
            <span
              key={i}
              className="flex items-center gap-1.5 pl-2 pr-1 py-1 rounded-full text-xs font-bold"
              style={{ background: "#d1fae5", color: "#065f46" }}
            >
              {goal.member && (
                <PlayerAvatar photo={goal.member.photo} fullName={goal.member.fullName} size={18} />
              )}
              <Icon name="ball" size={13} className="icon-inline" />
              {goal.member?.fullName ?? matchDisplay.unknownScorer}
              {goal.minute ? ` ${goal.minute}'` : ""}
              {goal.count > 1 ? ` (${goal.count})` : ""}
              {goal.kind === "PENALTY" && ` (${matchDisplay.penaltyShort})`}
              {goal.kind === "OWN_GOAL" && ` (${matchDisplay.ownGoal})`}
            </span>
          ))}
        </div>
      )}

      {football && match.bookings.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {match.bookings.map((booking, i) => (
            <span
              key={i}
              className="flex items-center gap-1.5 pl-2 pr-1 py-1 rounded-full text-xs font-bold"
              style={{ background: "#fee2e2", color: "#991b1b" }}
            >
              <PlayerAvatar
                photo={booking.member.photo}
                fullName={booking.member.fullName}
                size={18}
              />
              <CardChip type={booking.cardType as "YELLOW" | "RED"} />
              {booking.member.fullName}
              {booking.minute ? ` (${booking.minute}')` : ""}
            </span>
          ))}
        </div>
      )}

      {football && match.manOfTheMatch && (
        <p
          className="text-xs font-semibold flex items-center gap-1.5"
          style={{ color: "var(--mint-700)" }}
        >
          <PlayerAvatar
            photo={match.manOfTheMatch.photo}
            fullName={match.manOfTheMatch.fullName}
            size={20}
          />
          <Icon name="star" size={13} className="icon-inline" filled />
          {matchDisplay.motm} {match.manOfTheMatch.fullName}
        </p>
      )}

      {priorMeetings.length > 0 && (
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          {matchDisplay.priorMeetings}{" "}
          {priorMeetings.map((pm, i) => (
            <span key={pm.id}>
              {i > 0 && "، "}
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
          status={match.mvpVote.status as "OPEN" | "CLOSED"}
          candidates={match.mvpVote.candidates.map((c) => ({
            id: c.id,
            fullName: c.member.fullName,
            voteCount: c._count.votes,
          }))}
          loggedIn={loggedIn}
          initialMyVoteCandidateId={myVoteCandidateId}
        />
      )}
    </div>
  );
}
