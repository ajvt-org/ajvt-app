import Scoreline from "./Scoreline";
import MatchTeams from "./matchCard/MatchTeams";
import MatchMeta from "./matchCard/MatchMeta";
import MatchEvents from "./matchCard/MatchEvents";
import ShareResultButton from "./ShareResultButton";
import MvpVoteWidget from "./MvpVoteWidget";
import { getHeadToHead } from "@/lib/tournament";
import { matchEventRows } from "@/lib/matchEvents";
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
            memberId: g.member?.id ?? null,
            fullName: g.member?.fullName ?? matchDisplay.unknownScorer,
            photo: g.member?.photo ?? null,
            count: g.count,
            minute: g.minute,
            kind: g.kind,
            isHome: g.teamId === match.homeTeam.id,
          }))}
          bookings={(football ? match.bookings : []).map((b) => ({
            memberId: b.member.id,
            fullName: b.member.fullName,
            photo: b.member.photo,
            cardType: b.cardType as "YELLOW" | "RED",
            minute: b.minute,
            isHome: b.teamId === match.homeTeam.id,
          }))}
        />
      </div>

      {football && <MatchEvents rows={matchEventRows(match)} />}

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
