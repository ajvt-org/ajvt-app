"use client";

import { useState } from "react";
import InlineRename from "./InlineRename";
import RosterChip from "./RosterChip";
import type { Team } from "./types";
import { teamsTab } from "@/lib/texts";

export default function TeamRoster({
  team,
  suspendedIds,
  busy,
  onRenameMember,
  onSetCaptain,
  onApproveMember,
  onRemoveMember,
}: {
  team: Team;
  suspendedIds: string[];
  busy: boolean;
  onRenameMember: (memberId: string, name: string) => void;
  onSetCaptain: (memberId: string | null) => void;
  onApproveMember: (memberId: string) => void;
  onRemoveMember: (memberId: string) => void;
}) {
  const [renamingMemberId, setRenamingMemberId] = useState<string | null>(null);

  if (team.members.length === 0) {
    return (
      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
        {teamsTab.noPlayers}
      </p>
    );
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {team.members.map((entry) =>
        renamingMemberId === entry.member.id ? (
          <InlineRename
            key={entry.member.id}
            value={entry.member.fullName}
            maxLength={30}
            busy={busy}
            onSave={(next) => {
              onRenameMember(entry.member.id, next);
              setRenamingMemberId(null);
            }}
            onCancel={() => setRenamingMemberId(null)}
          />
        ) : (
          <RosterChip
            key={entry.member.id}
            entry={entry}
            suspended={suspendedIds.includes(entry.member.id)}
            captain={entry.member.id === team.captainUserId}
            busy={busy}
            onRename={() => setRenamingMemberId(entry.member.id)}
            onToggleCaptain={() =>
              onSetCaptain(entry.member.id === team.captainUserId ? null : entry.member.id)
            }
            onApprove={() => onApproveMember(entry.member.id)}
            onRemove={() => onRemoveMember(entry.member.id)}
          />
        ),
      )}
    </div>
  );
}
