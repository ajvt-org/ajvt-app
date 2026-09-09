import Scoreline from "./Scoreline";
import MatchTeams from "./matchCard/MatchTeams";
import MatchMeta from "./matchCard/MatchMeta";
import MatchEvents from "./matchCard/MatchEvents";
import MatchTimeline from "./matchCard/MatchTimeline";
import MatchCardHead from "./matchCard/MatchCardHead";
import MvpVoteWidget from "./MvpVoteWidget";
import { getHeadToHead } from "@/lib/tournament";
import { matchEventRows, matchTimeline, withoutScorersAndCards } from "@/lib/matchEvents";
import { forfeitLoserTeamId } from "@/lib/forfeit";
import { isVoteClosed } from "@/lib/mvpVote";
import { formatTime } from "@/lib/clubTime";
import type { DecidedMatch, PublicMatch } from "./publicTypes";
import type { EntrantKind } from "@/lib/entrant";
import { matchDisplay, mvpVote as voteTexts } from "@/lib/texts";
import SeriesScoreline from "@/components/admin/tournament/SeriesScoreline";
import MatchUnits from "./MatchUnits";
import { countedUnits, ladderOf, type LevelRow } from "@/lib/matchLevels";

export default function MatchResult({
  match,
  day,
  allMatches,
  football = true,
  levels = [],
  showScorersAndCards = true,
  loggedIn,
  myVoteCandidateId,
  manOfTheMatchTeam = null,
  entrant = "team",
}: {
  match: DecidedMatch;
  day: { round: string | null; venue: string | null };
  allMatches: PublicMatch[];
  football?: boolean;
  levels?: LevelRow[];
  showScorersAndCards?: boolean;
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
  const ladder = ladderOf(levels);
  const unitLevel = ladder[1] ?? null;
  const hideGoalsOfTeamId = match.forfeitWinnerTeamId
    ? forfeitLoserTeamId(match.forfeitWinnerTeamId, match.firstTeam.id, match.secondTeam.id)
    : null;
  const eventRows = matchEventRows({
    ...match,
    homeTeamId: match.firstTeam.id,
    manOfTheMatchTeam,
    hideGoalsOfTeamId,
  });
  const vote = football && match.mvpVote ? match.mvpVote : null;
  const voteOpen =
    vote !== null &&
    !isVoteClosed({
      status: vote.status as "OPEN" | "CLOSED",
      closesAt: vote.closesAt,
    });

  return (
    <div className="card p-4 space-y-1.5">
      <MatchCardHead time={match.matchDate ? formatTime(match.matchDate) : null}>
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
        size="xl"
        layout="stacked"
        entrant={entrant}
      />

      {match.series && (
        <>
          <div className="flex justify-center">
            <SeriesScoreline
              units={match.units}
              standing={match.series}
              unitWord={unitLevel?.singular ?? ""}
              extensionUnits={
                unitLevel ? countedUnits(ladder[0].continueUnits ?? 0, unitLevel) : ""
              }
            />
          </div>
          <MatchUnits
            units={match.units}
            levels={ladder}
            sides={[match.firstTeam.name, match.secondTeam.name]}
          />
        </>
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
            badge={voteOpen ? voteTexts.open : null}
          >
            {vote && (
              <MvpVoteWidget
                matchId={match.id}
                status={voteOpen ? "OPEN" : "CLOSED"}
                closesAt={vote.closesAt}
                candidates={vote.candidates.map((c) => ({
                  id: c.id,
                  fullName: c.member.fullName,
                  voteCount: c._count.votes,
                }))}
                loggedIn={loggedIn}
                initialMyVoteCandidateId={myVoteCandidateId}
              />
            )}
          </MatchTimeline>
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
    </div>
  );
}
