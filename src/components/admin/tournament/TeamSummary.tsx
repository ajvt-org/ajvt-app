"use client";

import Icon from "@/components/Icon";
import IconLabel from "@/components/IconLabel";
import TeamLogo from "@/components/tournament/TeamLogo";
import type { Team } from "./types";
import { teamsTab } from "@/lib/texts";
import { rosterFault, squadLabel, type SquadSize } from "@/lib/teamSize";

const COMPLETE = { background: "#d1fae5", color: "#065f46" };
const SHORT = { background: "#fef3c7", color: "#92400e" };
const OVER = { background: "#fee2e2", color: "#991b1b" };

function rosterTone(count: number, squad: SquadSize) {
  const fault = rosterFault(count, squad);
  if (fault === null) return COMPLETE;
  return fault === "short" ? SHORT : OVER;
}

export default function TeamSummary({
  team,
  shownName,
  squad,
  busy,
  onToggle,
  onDeleteTeam,
}: {
  team: Team;
  shownName: string;
  squad: SquadSize;
  busy: boolean;
  onToggle: () => void;
  onDeleteTeam: () => void;
}) {
  const count = team.members.length;
  const awaiting = team.members.filter((m) => m.status === "PENDING").length;
  const tone = rosterTone(count, squad);
  const label = squadLabel(squad);

  return (
    <summary
      className="disclosure-summary cursor-pointer space-y-1.5"
      onClick={(e) => {
        e.preventDefault();
        onToggle();
      }}
    >
      <div className="flex items-start gap-2">
        <span className="summary-logo h-6 flex items-center shrink-0">
          <TeamLogo logo={team.logo} name={shownName} size={32} />
        </span>
        <p
          className="min-w-0 flex-1 font-black text-base leading-6 optical-name"
          style={{ color: "var(--text-main)", overflowWrap: "anywhere" }}
        >
          {shownName}
        </p>
        <span className="h-6 flex items-center shrink-0">
          <Icon name="chevronDown" size={16} className="disclosure-chevron" />
        </span>
        <span className="h-6 flex items-center shrink-0">
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
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="badge" style={tone}>
          <IconLabel name="users">
            {label === null ? teamsTab.rosterCount(count) : teamsTab.rosterOf(count, label)}
          </IconLabel>
        </span>
        {awaiting > 0 && (
          <span className="badge badge-pending">
            <IconLabel name="clock">{teamsTab.awaitingCount(awaiting)}</IconLabel>
          </span>
        )}
      </div>
    </summary>
  );
}
