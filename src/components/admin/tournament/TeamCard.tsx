"use client";

import AddPlayerRow from "./AddPlayerRow";
import TeamIdentityEditor from "./TeamIdentityEditor";
import TeamRoster from "./TeamRoster";
import TeamSummary from "./TeamSummary";
import { teamsTab } from "@/lib/texts";
import type { RosterMember, Team, TeamMemberEntry } from "./types";
import type { SquadSize } from "@/lib/teamSize";

export default function TeamCard({
  team,
  shownName,
  squad,
  members,
  open,
  candidates,
  suspendedIds,
  busy,
  onToggle,
  onRenameTeam,
  onDeleteTeam,
  onSetLogo,
  onSetCaptain,
  onAddMember,
  onApproveMember,
  onRemoveMember,
}: {
  team: Team;
  shownName: string;
  squad: SquadSize;
  members: TeamMemberEntry[];
  open: boolean;
  candidates: RosterMember[];
  suspendedIds: string[];
  busy: boolean;
  onToggle: () => void;
  onRenameTeam: (name: string) => void;
  onDeleteTeam: () => void;
  onSetLogo: (filename: string) => Promise<void>;
  onSetCaptain: (memberId: string | null) => void;
  onAddMember: (userId: string) => void;
  onApproveMember: (memberId: string) => void;
  onRemoveMember: (memberId: string) => void;
}) {
  return (
    <details className="card p-4" open={open}>
      <TeamSummary
        team={team}
        shownName={shownName}
        squad={squad}
        busy={busy}
        onToggle={onToggle}
        onDeleteTeam={onDeleteTeam}
      />
      <div className="space-y-3 pt-3">
        <TeamIdentityEditor
          name={team.name}
          logo={team.logo}
          busy={busy}
          onRenameTeam={onRenameTeam}
          onSetLogo={onSetLogo}
        />
        {members.length < team.members.length && (
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            {teamsTab.rosterSubset(members.length, team.members.length)}
          </p>
        )}
        <TeamRoster
          team={team}
          members={members}
          suspendedIds={suspendedIds}
          busy={busy}
          onSetCaptain={onSetCaptain}
          onApproveMember={onApproveMember}
          onRemoveMember={onRemoveMember}
        />
        <AddPlayerRow candidates={candidates} busy={busy} onAddMember={onAddMember} />
      </div>
    </details>
  );
}
