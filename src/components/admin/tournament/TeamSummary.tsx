"use client";

import Icon from "@/components/Icon";
import IconLabel from "@/components/IconLabel";
import SquadBar from "./SquadBar";
import TeamIdentityEditor, { ONTO_FIRST_LINE } from "./TeamIdentityEditor";
import type { OutsideShare } from "@/lib/squadBar";
import type { Team } from "./types";
import { teamsTab } from "@/lib/texts";
import { rosterFault, squadIsBarred, type SquadSize } from "@/lib/squadSize";
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
  outside,
  busy,
  onToggle,
  onRenameTeam,
  onSetLogo,
  onDeleteTeam,
}: {
  team: Team;
  shownName: string;
  squad: SquadSize;
  outside: OutsideShare | null;
  busy: boolean;
  onToggle: (summary: HTMLElement) => void;
  onRenameTeam: (name: string) => void;
  onSetLogo: (filename: string) => Promise<void>;
  onDeleteTeam: () => void;
}) {
  const count = team.members.length;
  const awaiting = team.members.filter((m) => m.status === "PENDING").length;
  const tone = rosterTone(count, squad);
  const barred = squadIsBarred(squad);

  return (
    <summary
      className="disclosure-summary cursor-pointer"
      onClick={(e) => {
        e.preventDefault();
        onToggle(e.currentTarget);
      }}
    >
      <TeamIdentityEditor
        name={team.name}
        shownName={shownName}
        logo={team.logo}
        busy={busy}
        onRenameTeam={onRenameTeam}
        onSetLogo={onSetLogo}
        controls={
          <>
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
          </>
        }
      >
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
      </TeamIdentityEditor>
    </summary>
  );
}
