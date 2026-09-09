"use client";

import Icon from "@/components/Icon";
import IconLabel from "@/components/IconLabel";
import SquadBar from "./SquadBar";
import TeamIdentityEditor, { ROW_ACTION_ICON } from "./TeamIdentityEditor";
import { SQUARE } from "./MatchCardActions";
import type { OutsideShare } from "@/lib/squadBar";
import type { Team } from "./types";
import { teamsTab } from "@/lib/texts";
import { rosterFault, squadIsBarred, type SquadSize } from "@/lib/squadSize";
import { isInvitation, isMember, isRequest } from "@/lib/teamInvites";
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
  const count = team.members.filter(isMember).length;
  const requests = team.members.filter(isRequest).length;
  const invitations = team.members.filter(isInvitation).length;
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
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onDeleteTeam();
            }}
            disabled={busy}
            aria-label={teamsTab.deleteTeam}
            className={SQUARE}
            style={{ background: "#fee2e2", color: "#991b1b" }}
          >
            <Icon name="trash" size={ROW_ACTION_ICON} />
          </button>
        }
        marker={<Icon name="chevronDown" size={14} className="disclosure-chevron" />}
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
        {(requests > 0 || invitations > 0) && (
          <div className="flex flex-wrap items-center gap-1.5">
            {requests > 0 && (
              <span className="badge badge-pending">
                <IconLabel name="clock">{teamsTab.requestCount(requests)}</IconLabel>
              </span>
            )}
            {invitations > 0 && (
              <span className="badge badge-pending">
                <IconLabel name="bell">{teamsTab.invitationCount(invitations)}</IconLabel>
              </span>
            )}
          </div>
        )}
      </TeamIdentityEditor>
    </summary>
  );
}
