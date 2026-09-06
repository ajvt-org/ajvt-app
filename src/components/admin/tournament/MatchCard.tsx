"use client";

import Scoreline from "@/components/tournament/Scoreline";
import MatchTeams from "@/components/tournament/matchCard/MatchTeams";
import MatchMeta from "@/components/tournament/matchCard/MatchMeta";
import MatchEvents from "@/components/tournament/matchCard/MatchEvents";
import MatchTimeline from "@/components/tournament/matchCard/MatchTimeline";
import MatchCardHead from "@/components/tournament/matchCard/MatchCardHead";
import { getHeadToHead } from "@/lib/tournament";
import { matchEventRows, matchTimeline, memberTeamName } from "@/lib/matchEvents";
import { formatMatchDateTime } from "@/lib/clubTime";
import { bothTeamsKnown, teamName } from "@/lib/fixtureTeams";
import { resultEntryAllowed } from "@/lib/matchKickoff";
import type { Match, Team } from "./types";
import BookingsForm from "./BookingsForm";
import MatchDetailsForm from "./MatchDetailsForm";
import MvpVoteAdmin from "./MvpVoteAdmin";
import ResultForm from "./ResultForm";
import SeriesScoreline from "./SeriesScoreline";
import type { SeriesConfig } from "./seriesConfig";
import MatchCardActions from "./MatchCardActions";
import IconLabel from "@/components/IconLabel";
import { matchAdmin as texts, lists } from "@/lib/texts";
import type { EntrantKind } from "@/lib/entrant";

export default function MatchCard({
  match,
  teams,
  allMatches,
  activityId,
  matchShape,
  series,
  entrant = "team",
  suspendedIds,
  mvpVoteMinutes,
  onDelete,
  showResultForm,
  onToggleResultForm,
  showMvp,
  onToggleMvp,
  showDetails,
  onToggleDetails,
  onMoveUp,
  onMoveDown,
  onSaved,
  onChange,
}: {
  match: Match;
  teams: Team[];
  allMatches: Match[];
  activityId: string;
  matchShape: "FOOTBALL" | "SERIES";
  series: SeriesConfig | null;
  entrant?: EntrantKind;
  suspendedIds: string[];
  mvpVoteMinutes: number;
  onDelete: () => void;
  showResultForm: boolean;
  onToggleResultForm: () => void;
  showMvp: boolean;
  onToggleMvp: () => void;
  showDetails: boolean;
  onToggleDetails: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onSaved: () => void;
  onChange: () => void;
}) {
  const decided = bothTeamsKnown(match);
  const played = match.status === "PLAYED";
  const resultAllowed = resultEntryAllowed(played, match.matchDate, new Date());
  const football = matchShape === "FOOTBALL";
  const priorMeetings = decided
    ? getHeadToHead(allMatches, match.firstTeam.id, match.secondTeam.id, match.id)
    : [];
  const events =
    decided && football
      ? matchEventRows({
          ...match,
          homeTeamId: match.firstTeam.id,
          manOfTheMatchTeam: memberTeamName(match.manOfTheMatch?.id, teams),
        })
      : [];
  return (
    <div className="card p-4">
      <MatchCardHead time={match.matchDate ? formatMatchDateTime(match.matchDate) : null}>
        <MatchMeta
          round={match.round}
          venue={match.venue}
          penalties={
            match.homePenalties !== null && match.awayPenalties !== null
              ? { home: match.homePenalties, away: match.awayPenalties }
              : null
          }
        >
          {match.isKnockout && <span className="badge badge-pending">{texts.knockoutBadge}</span>}
        </MatchMeta>
      </MatchCardHead>

      <div className="mt-2">
        <MatchTeams
          home={{
            name: teamName(match.firstTeam),
            logo: match.firstTeam?.logo,
            photo: match.firstTeam?.photo,
          }}
          away={{
            name: teamName(match.secondTeam),
            logo: match.secondTeam?.logo,
            photo: match.secondTeam?.photo,
          }}
          score={football && played ? { home: match.homeScore, away: match.awayScore } : null}
          layout="stacked"
          entrant={entrant}
        />
        {series && match.series && (
          <div className="mt-1.5">
            <SeriesScoreline
              parts={match.parts}
              standing={match.series}
              partWord={series.partWord}
              adjustments={match.adjustments}
              sides={[teamName(match.firstTeam), teamName(match.secondTeam)]}
            />
          </div>
        )}
        {priorMeetings.length > 0 && (
          <p
            className="text-xs mt-1 flex items-center gap-1.5 flex-wrap"
            style={{ color: "var(--text-muted)" }}
          >
            <IconLabel name="refresh">{texts.priorMeetings}</IconLabel>
            <span>
              {priorMeetings.map((pm, i) => (
                <span key={pm.id}>
                  {i > 0 && lists.separator}
                  {pm.status === "PLAYED" ? (
                    <Scoreline home={pm.homeScore} away={pm.awayScore} />
                  ) : (
                    texts.upcomingShort
                  )}
                </span>
              ))}
            </span>
          </p>
        )}
      </div>

      {decided && events.length > 0 && (
        <div className="mt-2 pt-2 space-y-2" style={{ borderTop: "1px solid var(--mint-100)" }}>
          <MatchEvents rows={events} />
          <MatchTimeline
            entries={matchTimeline({ ...match, homeTeamId: match.firstTeam.id })}
            teams={{ home: match.firstTeam.name, away: match.secondTeam.name }}
          />
        </div>
      )}

      <MatchCardActions
        played={played}
        decided={decided}
        resultAllowed={resultAllowed}
        football={football}
        showMvp={showMvp}
        showDetails={showDetails}
        onDelete={onDelete}
        onToggleResultForm={onToggleResultForm}
        onToggleMvp={onToggleMvp}
        onToggleDetails={onToggleDetails}
        onMoveUp={onMoveUp}
        onMoveDown={onMoveDown}
      />

      {decided && resultAllowed && showResultForm && (
        <>
          <ResultForm
            match={match}
            teams={teams}
            activityId={activityId}
            matchShape={matchShape}
            series={series}
            suspendedIds={suspendedIds}
            onSaved={onSaved}
          />
          {football && (
            <BookingsForm
              match={match}
              teams={teams}
              suspendedIds={suspendedIds}
              onChange={onChange}
            />
          )}
        </>
      )}
      {decided && football && showMvp && (
        <MvpVoteAdmin
          match={match}
          teams={teams}
          defaultMinutes={mvpVoteMinutes}
          onChange={onChange}
        />
      )}
      {showDetails && (
        <MatchDetailsForm
          match={match}
          teams={teams}
          entrant={entrant}
          football={football}
          onChange={onChange}
        />
      )}
    </div>
  );
}
