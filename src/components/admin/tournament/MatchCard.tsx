"use client";

import Scoreline from "@/components/tournament/Scoreline";
import MatchTeams from "@/components/tournament/matchCard/MatchTeams";
import MatchMeta from "@/components/tournament/matchCard/MatchMeta";
import MatchEvents from "@/components/tournament/matchCard/MatchEvents";
import MatchCardHead from "@/components/tournament/matchCard/MatchCardHead";
import { getHeadToHead } from "@/lib/tournament";
import { matchEventRows, memberTeamName } from "@/lib/matchEvents";
import { formatMatchDateTime } from "@/lib/clubTime";
import type { Match, Team } from "./types";
import BookingsForm from "./BookingsForm";
import MatchDetailsForm from "./MatchDetailsForm";
import MvpVoteAdmin from "./MvpVoteAdmin";
import ResultForm from "./ResultForm";
import MatchCardActions from "./MatchCardActions";
import IconLabel from "@/components/IconLabel";
import { matchAdmin as texts } from "@/lib/texts";

export default function MatchCard({
  match,
  teams,
  allMatches,
  profile,
  suspendedIds,
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
  profile: "FOOTBALL" | "BOARD";
  suspendedIds: string[];
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
  const priorMeetings = getHeadToHead(allMatches, match.homeTeam.id, match.awayTeam.id, match.id);
  const football = profile === "FOOTBALL";
  const events = football
    ? matchEventRows({
        ...match,
        homeTeamId: match.homeTeam.id,
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
          home={{ name: match.homeTeam.name, logo: match.homeTeam.logo }}
          away={{ name: match.awayTeam.name, logo: match.awayTeam.logo }}
          score={
            match.status === "PLAYED" ? { home: match.homeScore, away: match.awayScore } : null
          }
        />
        {priorMeetings.length > 0 && (
          <p
            className="text-xs mt-1 flex items-center gap-1.5 flex-wrap"
            style={{ color: "var(--text-muted)" }}
          >
            <IconLabel name="refresh">{texts.priorMeetings}</IconLabel>
            <span>
              {priorMeetings.map((pm, i) => (
                <span key={pm.id}>
                  {i > 0 && "، "}
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

      {events.length > 0 && (
        <div className="mt-2 pt-2" style={{ borderTop: "1px solid var(--mint-100)" }}>
          <MatchEvents rows={events} />
        </div>
      )}

      <MatchCardActions
        played={match.status === "PLAYED"}
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

      {showResultForm && (
        <>
          <ResultForm
            match={match}
            teams={teams}
            profile={profile}
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
      {football && showMvp && <MvpVoteAdmin match={match} teams={teams} onChange={onChange} />}
      {showDetails && <MatchDetailsForm match={match} teams={teams} onChange={onChange} />}
    </div>
  );
}
