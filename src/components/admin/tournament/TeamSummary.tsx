"use client";

import Icon from "@/components/Icon";
import IconLabel from "@/components/IconLabel";
import TeamLogo from "@/components/tournament/TeamLogo";
import type { Team } from "./types";
import { teamsTab } from "@/lib/texts";

const COMPLETE = { background: "#d1fae5", color: "#065f46" };
const SHORT = { background: "#fef3c7", color: "#92400e" };
const OVER = { background: "#fee2e2", color: "#991b1b" };

function rosterTone(count: number, teamSize: number | null) {
  if (teamSize === null || count === teamSize) return COMPLETE;
  return count < teamSize ? SHORT : OVER;
}

export default function TeamSummary({
  team,
  shownName,
  teamSize,
  busy,
  onDeleteTeam,
}: {
  team: Team;
  shownName: string;
  teamSize: number | null;
  busy: boolean;
  onDeleteTeam: () => void;
}) {
  const count = team.members.length;
  const awaiting = team.members.filter((m) => m.status === "PENDING").length;
  const tone = rosterTone(count, teamSize);

  return (
    <summary className="disclosure-summary cursor-pointer space-y-1.5">
      <div className="flex items-start gap-2">
        <span className="summary-logo inline-flex">
          <TeamLogo logo={team.logo} name={shownName} size={32} />
        </span>
        <p
          className="min-w-0 flex-1 font-black text-base"
          style={{ color: "var(--text-main)", overflowWrap: "anywhere" }}
        >
          {shownName}
        </p>
        <Icon name="chevronDown" size={16} className="disclosure-chevron mt-2 shrink-0" />
        <button
          onClick={(e) => {
            e.preventDefault();
            onDeleteTeam();
          }}
          disabled={busy}
          aria-label={teamsTab.deleteTeam}
          className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: "#fee2e2", color: "#991b1b" }}
        >
          <Icon name="trash" size={16} />
        </button>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="badge" style={tone}>
          <IconLabel name="users">
            {teamSize === null ? teamsTab.rosterCount(count) : teamsTab.rosterOf(count, teamSize)}
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
