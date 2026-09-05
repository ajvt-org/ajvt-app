"use client";

import AddPlayerRow from "./AddPlayerRow";
import TeamIdentityEditor from "./TeamIdentityEditor";
import TeamRoster from "./TeamRoster";
import TeamSummary from "./TeamSummary";
import { teamsTab } from "@/lib/texts";
import type { RosterMember, Team, TeamMemberEntry } from "./types";
import { playerOverOutsideLimit, type SquadBreach, type SquadSettings } from "@/lib/squadRules";

export default function TeamCard({
  team,
  shownName,
  settings,
  breaches,
  members,
  open,
  candidates,
  suspendedIds,
  busy,
  onToggle,
  onRenameTeam,
  onDeleteTeam,
  onSetLogo,
  onSetFromHomeVillage,
  onSetCaptain,
  onAddMember,
  onApproveMember,
  onRemoveMember,
}: {
  team: Team;
  shownName: string;
  settings: SquadSettings;
  breaches: SquadBreach[];
  members: TeamMemberEntry[];
  open: boolean;
  candidates: RosterMember[];
  suspendedIds: string[];
  busy: boolean;
  onToggle: (summary: HTMLElement) => void;
  onRenameTeam: (name: string) => void;
  onDeleteTeam: () => void;
  onSetLogo: (filename: string) => Promise<void>;
  onSetFromHomeVillage: (value: boolean) => void;
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
        squad={settings.squad}
        breaches={breaches}
        busy={busy}
        onToggle={onToggle}
        onDeleteTeam={onDeleteTeam}
      />
      <div className="space-y-3 pt-3">
        <TeamIdentityEditor
          name={team.name}
          logo={team.logo}
          busy={busy}
          askVillage={settings.organisedByHomeVillage}
          fromHomeVillage={team.fromHomeVillage}
          onRenameTeam={onRenameTeam}
          onSetFromHomeVillage={onSetFromHomeVillage}
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
          overLimit={(memberId) => playerOverOutsideLimit(breaches, memberId)}
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
