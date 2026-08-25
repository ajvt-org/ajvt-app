"use client";

import Scoreline from "@/components/tournament/Scoreline";
import MatchTeams from "@/components/tournament/matchCard/MatchTeams";
import MatchMeta from "@/components/tournament/matchCard/MatchMeta";
import MatchEvents from "@/components/tournament/matchCard/MatchEvents";
import { getHeadToHead } from "@/lib/tournament";
import { matchEventRows } from "@/lib/matchEvents";
import { formatMatchDateTime } from "@/lib/clubTime";
import type { Match, Team } from "./types";
import BookingsForm from "./BookingsForm";
import MatchDetailsForm from "./MatchDetailsForm";
import MvpVoteAdmin from "./MvpVoteAdmin";
import ResultForm from "./ResultForm";
import Icon from "@/components/Icon";
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
  const events = football ? matchEventRows(match) : [];
  return (
    <div className="card p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <MatchTeams
            home={{ name: match.homeTeam.name, logo: match.homeTeam.logo }}
            away={{ name: match.awayTeam.name, logo: match.awayTeam.logo }}
            score={
              match.status === "PLAYED" ? { home: match.homeScore, away: match.awayScore } : null
            }
          />
          <div className="mt-1">
            <MatchMeta
              time={match.matchDate ? formatMatchDateTime(match.matchDate) : null}
              round={match.round}
              venue={match.venue}
              penalties={
                match.homePenalties !== null && match.awayPenalties !== null
                  ? { home: match.homePenalties, away: match.awayPenalties }
                  : null
              }
            >
              {match.isKnockout && (
                <span className="badge badge-pending">{texts.knockoutBadge}</span>
              )}
            </MatchMeta>
          </div>
          {priorMeetings.length > 0 && (
            <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
              <IconLabel name="refresh">{texts.priorMeetings}</IconLabel>{" "}
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
            </p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {(onMoveUp || onMoveDown) && (
            <div className="flex flex-col gap-0.5">
              <button
                onClick={onMoveUp}
                disabled={!onMoveUp}
                className="w-6 h-5 rounded flex items-center justify-center text-xs font-bold disabled:opacity-30"
                style={{ background: "var(--mint-100)", color: "var(--mint-700)" }}
                title={texts.moveUp}
              >
                <Icon name="chevronUp" size={12} />
              </button>
              <button
                onClick={onMoveDown}
                disabled={!onMoveDown}
                className="w-6 h-5 rounded flex items-center justify-center text-xs font-bold disabled:opacity-30"
                style={{ background: "var(--mint-100)", color: "var(--mint-700)" }}
                title={texts.moveDown}
              >
                <Icon name="chevronDown" size={12} />
              </button>
            </div>
          )}
          <button
            onClick={onToggleResultForm}
            className="text-xs px-2.5 py-1.5 rounded-lg font-bold"
            style={{ background: "var(--mint-100)", color: "var(--mint-700)" }}
          >
            {match.status === "PLAYED" ? texts.editResult : texts.enterResult}
          </button>
          <button
            onClick={onDelete}
            className="text-xs px-2.5 py-1.5 rounded-lg font-bold"
            style={{ background: "#fee2e2", color: "#991b1b" }}
          >
            <Icon name="trash" size={13} />
          </button>
        </div>
      </div>

      {events.length > 0 && (
        <div className="mt-2 pt-2" style={{ borderTop: "1px solid var(--mint-100)" }}>
          <MatchEvents rows={events} />
        </div>
      )}

      <div className="flex gap-2 mt-2">
        {football && (
          <button
            onClick={onToggleMvp}
            className="text-xs px-2.5 py-1.5 rounded-lg font-bold"
            style={{
              background: "white",
              color: "var(--mint-700)",
              border: "1px solid var(--mint-200)",
            }}
          >
            {showMvp ? texts.hideMvp : <IconLabel name="star">{texts.mvpVote}</IconLabel>}
          </button>
        )}
        <button
          onClick={onToggleDetails}
          className="text-xs px-2.5 py-1.5 rounded-lg font-bold"
          style={{
            background: "white",
            color: "var(--mint-700)",
            border: "1px solid var(--mint-200)",
          }}
        >
          {showDetails ? (
            texts.hideDetails
          ) : (
            <IconLabel name="pencil">{texts.editDetails}</IconLabel>
          )}
        </button>
      </div>

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
