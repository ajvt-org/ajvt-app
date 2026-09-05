"use client";

import BracketTree from "@/components/tournament/BracketTree";
import { getMatchWinnerTeamId } from "@/lib/tournament";
import { bothTeamsKnown } from "@/lib/fixtureTeams";
import ArrowLabel from "@/components/ArrowLabel";
import Icon from "@/components/Icon";
import IconLabel from "@/components/IconLabel";
import BracketSuggestion from "./BracketSuggestion";
import { matchAdmin as texts } from "@/lib/texts";
import type { MatchesState } from "./matchesState";

export default function BracketPanel({
  activityId,
  busy,
  state,
  onAction,
}: {
  activityId: string;
  busy: boolean;
  state: MatchesState;
  onAction: (endpoint: string, confirmMsg: string, body?: object) => void;
}) {
  const {
    bracketMatches,
    finalRound,
    bracketIsFinalDone,
    canAdvanceBracket,
    knockoutLocked,
    isTwoGroupFormat,
    firstRoundWaiting,
    firstRoundRedoable,
  } = state;

  const fillFirstRound = isTwoGroupFormat ? (
    <BracketSuggestion
      activityId={activityId}
      busy={busy}
      onValidate={(redo) => onAction("suggestion", texts.confirmSemis, { redo })}
    />
  ) : (
    <>
      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
        {texts.drawHint}
      </p>
      <button
        onClick={() => onAction("draw", texts.confirmDraw)}
        disabled={busy}
        className="btn btn-primary text-sm"
        style={{ width: "auto" }}
      >
        <IconLabel name="dice">{texts.draw}</IconLabel>
      </button>
    </>
  );

  const lockedNote = (hint: string) => (
    <p className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>
      <Icon name="lock" size={14} className="icon-inline" /> {hint}
    </p>
  );

  return (
    <div className="card p-4 space-y-3">
      <p className="text-sm font-bold" style={{ color: "var(--text-main)" }}>
        <IconLabel name="trophy">
          {isTwoGroupFormat ? texts.bracketTwoGroups : texts.bracketKnockout}
        </IconLabel>
      </p>
      {bracketMatches.length === 0 ? (
        knockoutLocked ? (
          lockedNote(texts.knockoutLockedHint)
        ) : (
          fillFirstRound
        )
      ) : (
        <>
          <BracketTree matches={bracketMatches} />
          {firstRoundWaiting && !knockoutLocked && fillFirstRound}
          {firstRoundRedoable && (
            <button
              onClick={() =>
                isTwoGroupFormat
                  ? onAction("suggestion", texts.confirmRegenerateSemis, { redo: true })
                  : onAction("draw", texts.confirmRedraw, { redo: true })
              }
              disabled={busy}
              className="btn btn-primary text-sm"
              style={{ width: "auto" }}
            >
              <IconLabel name="dice">
                {isTwoGroupFormat ? texts.regenerateSemis : texts.redraw}
              </IconLabel>
            </button>
          )}
          {canAdvanceBracket && (
            <button
              onClick={() => onAction("next-round", texts.confirmNextRound)}
              disabled={busy}
              className="btn btn-primary text-sm"
            >
              <ArrowLabel>{texts.nextRound}</ArrowLabel>
            </button>
          )}
          {bracketIsFinalDone &&
            (() => {
              const finalMatch = finalRound[0];
              if (!bothTeamsKnown(finalMatch)) return null;
              const winnerId = getMatchWinnerTeamId({
                ...finalMatch,
                homeTeamId: finalMatch.homeTeam.id,
                awayTeamId: finalMatch.awayTeam.id,
              });
              const winnerName =
                winnerId === finalMatch.homeTeam.id
                  ? finalMatch.homeTeam.name
                  : finalMatch.awayTeam.name;
              return (
                <p className="text-sm font-black text-center" style={{ color: "var(--mint-700)" }}>
                  <IconLabel name="trophy">
                    {texts.champion} {winnerName}
                  </IconLabel>
                </p>
              );
            })()}
        </>
      )}
    </div>
  );
}
