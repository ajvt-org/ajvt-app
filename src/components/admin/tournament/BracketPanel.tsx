"use client";

import BracketTree from "@/components/tournament/BracketTree";
import { getMatchWinnerTeamId } from "@/lib/tournament";
import { bothTeamsKnown } from "@/lib/fixtureTeams";
import ArrowLabel from "@/components/ArrowLabel";
import Icon from "@/components/Icon";
import IconLabel from "@/components/IconLabel";
import BracketSuggestion from "./BracketSuggestion";
import { matchAdmin as texts } from "@/lib/texts";
import type { EntrantKind } from "@/lib/entrant";
import type { MatchesState } from "./matchesState";

export default function BracketPanel({
  activityId,
  busy,
  entrant,
  state,
  onAction,
}: {
  activityId: string;
  busy: boolean;
  entrant: EntrantKind;
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
    <button
      onClick={() => onAction("draw", texts.entrant[entrant].confirmDraw)}
      disabled={busy}
      className="btn btn-primary text-sm"
      style={{ width: "auto" }}
    >
      <IconLabel name="dice">{texts.draw}</IconLabel>
    </button>
  );

  if (bracketMatches.length === 0) {
    if (knockoutLocked) {
      return (
        <p className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>
          <Icon name="lock" size={14} className="icon-inline" /> {texts.knockoutLockedHint}
        </p>
      );
    }
    return fillFirstRound;
  }

  return (
    <div className="card p-4 space-y-3">
      <p className="text-sm font-bold" style={{ color: "var(--text-main)" }}>
        <IconLabel name="trophy">
          {isTwoGroupFormat ? texts.bracketTwoGroups : texts.bracketKnockout}
        </IconLabel>
      </p>
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
      {bracketIsFinalDone && <ChampionLine final={finalRound[0]} />}
    </div>
  );
}

function ChampionLine({ final }: { final: MatchesState["finalRound"][number] }) {
  if (!bothTeamsKnown(final)) return null;
  const winnerId = getMatchWinnerTeamId({
    ...final,
    firstTeamId: final.firstTeam.id,
    secondTeamId: final.secondTeam.id,
  });
  const winnerName = winnerId === final.firstTeam.id ? final.firstTeam.name : final.secondTeam.name;

  return (
    <p className="text-sm font-black text-center" style={{ color: "var(--mint-700)" }}>
      <IconLabel name="trophy">
        {texts.champion} {winnerName}
      </IconLabel>
    </p>
  );
}
