"use client";

import IconLabel from "@/components/IconLabel";
import MatchCard from "./MatchCard";
import type { Match, Team } from "./types";
import type { EntrantKind } from "@/lib/entrant";
import type { SeriesConfig } from "./seriesConfig";

export interface MatchCardCommon {
  activityId: string;
  teams: Team[];
  allMatches: Match[];
  matchShape: "FOOTBALL" | "SERIES";
  series: SeriesConfig | null;
  entrant: EntrantKind;
  suspendedIds: string[];
  mvpVoteMinutes: number;
}

export interface MatchCardPanels {
  resultFormFor: string | null;
  mvpFor: string | null;
  detailsFor: string | null;
  onToggleResultForm: (matchId: string) => void;
  onToggleMvp: (matchId: string) => void;
  onToggleDetails: (matchId: string) => void;
  onCloseResultForm: () => void;
}

export default function MatchListSection({
  title,
  icon,
  matches,
  common,
  panels,
  onDelete,
  onChange,
  onMove,
}: {
  title: string;
  icon: "calendar" | "check";
  matches: Match[];
  common: MatchCardCommon;
  panels: MatchCardPanels;
  onDelete: (matchId: string) => void;
  onChange: () => void;
  onMove?: (index: number, direction: "up" | "down") => void;
}) {
  if (matches.length === 0) return null;

  return (
    <div>
      <p className="text-sm font-bold mb-2" style={{ color: "var(--text-main)" }}>
        <IconLabel name={icon}>{title}</IconLabel>
      </p>
      <div className="space-y-3">
        {matches.map((match, i) => (
          <MatchCard
            key={match.id}
            match={match}
            {...common}
            onDelete={() => onDelete(match.id)}
            showResultForm={panels.resultFormFor === match.id}
            onToggleResultForm={() => panels.onToggleResultForm(match.id)}
            showMvp={panels.mvpFor === match.id}
            onToggleMvp={() => panels.onToggleMvp(match.id)}
            showDetails={panels.detailsFor === match.id}
            onToggleDetails={() => panels.onToggleDetails(match.id)}
            onMoveUp={onMove && i > 0 ? () => onMove(i, "up") : undefined}
            onMoveDown={onMove && i < matches.length - 1 ? () => onMove(i, "down") : undefined}
            onSaved={() => {
              panels.onCloseResultForm();
              onChange();
            }}
            onChange={onChange}
          />
        ))}
      </div>
    </div>
  );
}
