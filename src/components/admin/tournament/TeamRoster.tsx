"use client";

import RosterRow from "./RosterRow";
import type { Team, TeamMemberEntry } from "./types";
import { teamsTab } from "@/lib/texts";

export default function TeamRoster({
  team,
  members,
  overLimit,
  suspendedIds,
  busy,
  onSetCaptain,
  onApproveMember,
  onRemoveMember,
}: {
  team: Team;
  members: TeamMemberEntry[];
  overLimit: (memberId: string) => boolean;
  suspendedIds: string[];
  busy: boolean;
  onSetCaptain: (memberId: string | null) => void;
  onApproveMember: (memberId: string) => void;
  onRemoveMember: (memberId: string) => void;
}) {
  if (members.length === 0) {
    return (
      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
        {teamsTab.noPlayers}
      </p>
    );
  }

  return (
    <div className="space-y-2">
      {members.map((entry) => (
        <RosterRow
          key={entry.member.id}
          entry={entry}
          suspended={suspendedIds.includes(entry.member.id)}
          overLimit={overLimit(entry.member.id)}
          captain={entry.member.id === team.captainUserId}
          busy={busy}
          onToggleCaptain={() =>
            onSetCaptain(entry.member.id === team.captainUserId ? null : entry.member.id)
          }
          onApprove={() => onApproveMember(entry.member.id)}
          onRemove={() => onRemoveMember(entry.member.id)}
        />
      ))}
    </div>
  );
}
