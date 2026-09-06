"use client";

import Icon from "@/components/Icon";
import IconLabel from "@/components/IconLabel";
import TeamLogo from "@/components/tournament/TeamLogo";
import { MATCH_TEAMS_SIZES } from "@/components/tournament/matchCard/MatchTeams";
import SquadBar from "./SquadBar";
import type { OutsideShare } from "@/lib/squadBar";
import type { Team } from "./types";
import { teamsTab } from "@/lib/texts";
import { fixedSquad, rosterFault, type SquadSize } from "@/lib/squadSize";
const COMPLETE = { background: "#d1fae5", color: "#065f46" };
const SHORT = { background: "#fef3c7", color: "#92400e" };
const OVER = { background: "#fee2e2", color: "#991b1b" };

const CREST = MATCH_TEAMS_SIZES.md.logo;
const NAME_LINE = 24;
const ONTO_FIRST_LINE = (CREST - NAME_LINE) / 2;

function rosterTone(count: number, squad: SquadSize) {
  const fault = rosterFault(count, squad);
  if (fault === null) return COMPLETE;
  return fault === "short" ? SHORT : OVER;
}

export default function TeamSummary({
  team,
  shownName,
  squad,
  outside,
  busy,
  onToggle,
  onDeleteTeam,
}: {
  team: Team;
  shownName: string;
  squad: SquadSize;
  outside: OutsideShare | null;
  busy: boolean;
  onToggle: (summary: HTMLElement) => void;
  onDeleteTeam: () => void;
}) {
  const count = team.members.length;
  const awaiting = team.members.filter((m) => m.status === "PENDING").length;
  const tone = rosterTone(count, squad);
  const barred = squad.max !== null && fixedSquad(squad) === null;

  return (
    <summary
      className="disclosure-summary cursor-pointer space-y-1.5"
      onClick={(e) => {
        e.preventDefault();
        onToggle(e.currentTarget);
      }}
    >
      <div className="flex items-start gap-2">
        <span
          className="summary-logo flex items-center shrink-0"
          style={{ width: CREST, height: CREST }}
        >
          <TeamLogo logo={team.logo} name={shownName} size={CREST} />
        </span>
        <p
          className="min-w-0 flex-1 font-black text-base leading-6 optical-name"
          style={{
            color: "var(--text-main)",
            overflowWrap: "anywhere",
            marginBlockStart: ONTO_FIRST_LINE,
          }}
        >
          {shownName}
        </p>
        <span
          className="h-6 flex items-center shrink-0"
          style={{ marginBlockStart: ONTO_FIRST_LINE }}
        >
          <Icon name="chevronDown" size={16} className="disclosure-chevron" />
        </span>
        <span
          className="h-6 flex items-center shrink-0"
          style={{ marginBlockStart: ONTO_FIRST_LINE }}
        >
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onDeleteTeam();
            }}
            disabled={busy}
            aria-label={teamsTab.deleteTeam}
            className="w-9 h-9 rounded-lg flex items-center justify-center"
            style={{ background: "#fee2e2", color: "#991b1b" }}
          >
            <Icon name="trash" size={16} />
          </button>
        </span>
      </div>
      {barred ? (
        <SquadBar count={count} squad={squad} outside={outside} />
      ) : (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="badge" style={tone}>
            <IconLabel name="users">{teamsTab.rosterCount(count)}</IconLabel>
          </span>
        </div>
      )}
      {awaiting > 0 && (
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="badge badge-pending">
            <IconLabel name="clock">{teamsTab.awaitingCount(awaiting)}</IconLabel>
          </span>
        </div>
      )}
    </summary>
  );
}
