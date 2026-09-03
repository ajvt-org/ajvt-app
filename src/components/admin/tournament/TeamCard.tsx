"use client";

import IconLabel from "@/components/IconLabel";
import AddPlayerRow from "./AddPlayerRow";
import TeamIdentityEditor from "./TeamIdentityEditor";
import TeamRoster from "./TeamRoster";
import TeamSummary from "./TeamSummary";
import type { RosterMember, Team } from "./types";
import { teamsTab } from "@/lib/texts";

export default function TeamCard({
  team,
  shownName,
  teamSize,
  candidates,
  suspendedIds,
  busy,
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
  teamSize: number | null;
  candidates: RosterMember[];
  suspendedIds: string[];
  busy: boolean;
  onRenameTeam: (name: string) => void;
  onDeleteTeam: () => void;
  onSetLogo: (filename: string) => Promise<void>;
  onSetCaptain: (memberId: string | null) => void;
  onAddMember: (userId: string) => void;
  onApproveMember: (memberId: string) => void;
  onRemoveMember: (memberId: string) => void;
}) {
  const captain = team.members.find((m) => m.member.id === team.captainUserId)?.member ?? null;

  return (
    <details className="card p-4">
      <TeamSummary
        team={team}
        shownName={shownName}
        teamSize={teamSize}
        busy={busy}
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
        {captain && (
          <div className="flex flex-wrap gap-1.5">
            <span className="badge" style={{ background: "var(--mint-600)", color: "white" }}>
              <IconLabel name="star">{teamsTab.captainBadge(captain.fullName)}</IconLabel>
            </span>
          </div>
        )}
        <TeamRoster
          team={team}
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
