"use client";

import { useState } from "react";
import Icon from "@/components/Icon";
import IconLabel from "@/components/IconLabel";
import PhotoUpload from "@/components/PhotoUpload";
import InlineRename from "./InlineRename";
import RosterChip from "./RosterChip";
import type { RosterMember, Team } from "./types";
import { teamsTab } from "@/lib/texts";

const COMPLETE = { background: "#d1fae5", color: "#065f46" };
const SHORT = { background: "#fef3c7", color: "#92400e" };
const OVER = { background: "#fee2e2", color: "#991b1b" };

function rosterTone(count: number, teamSize: number | null) {
  if (teamSize === null || count === teamSize) return COMPLETE;
  return count < teamSize ? SHORT : OVER;
}

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
  onRenameMember,
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
  onRenameMember: (memberId: string, name: string) => void;
  onSetCaptain: (memberId: string | null) => void;
  onAddMember: (userId: string) => void;
  onApproveMember: (memberId: string) => void;
  onRemoveMember: (memberId: string) => void;
}) {
  const [renaming, setRenaming] = useState(false);
  const [renamingMemberId, setRenamingMemberId] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [picked, setPicked] = useState("");

  const count = team.members.length;
  const awaiting = team.members.filter((m) => m.status === "PENDING").length;
  const tone = rosterTone(count, teamSize);
  const captain = team.members.find((m) => m.member.id === team.captainUserId)?.member ?? null;

  return (
    <div className="card p-4 space-y-3">
      <div className="flex items-start gap-3">
        <PhotoUpload
          photo={team.logo}
          imageUrlPrefix="/api/files/team"
          variant="avatar"
          bare
          label={teamsTab.teamLogo}
          placeholderIcon="shield"
          onUpload={onSetLogo}
        />
        <div className="min-w-0 flex-1 space-y-1.5">
          {renaming ? (
            <InlineRename
              value={team.name}
              maxLength={40}
              busy={busy}
              onSave={(next) => {
                onRenameTeam(next);
                setRenaming(false);
              }}
              onCancel={() => setRenaming(false)}
            />
          ) : (
            <button
              onClick={() => setRenaming(true)}
              aria-label={teamsTab.renameTeam}
              className="text-start font-black text-base"
              style={{ color: "var(--text-main)", overflowWrap: "anywhere" }}
            >
              {shownName} <Icon name="pencil" size={13} className="icon-inline" />
            </button>
          )}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="badge" style={tone}>
              <IconLabel name="users">
                {teamSize === null
                  ? teamsTab.rosterCount(count)
                  : teamsTab.rosterOf(count, teamSize)}
              </IconLabel>
            </span>
            {captain && (
              <span className="badge" style={{ background: "var(--mint-600)", color: "white" }}>
                <IconLabel name="star">{teamsTab.captainBadge(captain.fullName)}</IconLabel>
              </span>
            )}
            {awaiting > 0 && (
              <span className="badge badge-pending">
                <IconLabel name="clock">{teamsTab.awaitingCount(awaiting)}</IconLabel>
              </span>
            )}
          </div>
        </div>
        <button
          onClick={onDeleteTeam}
          disabled={busy}
          aria-label={teamsTab.deleteTeam}
          className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: "#fee2e2", color: "#991b1b" }}
        >
          <Icon name="trash" size={16} />
        </button>
      </div>

      {count === 0 ? (
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          {teamsTab.noPlayers}
        </p>
      ) : (
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
      )}

      {adding ? (
        <div className="flex gap-2">
          <select
            value={picked}
            onChange={(e) => setPicked(e.target.value)}
            aria-label={teamsTab.addPlayer}
            className="input flex-1"
          >
            <option value="">{teamsTab.pickPlayer}</option>
            {candidates.map((m) => (
              <option key={m.id} value={m.id}>
                {m.fullName}
              </option>
            ))}
          </select>
          <button
            onClick={() => {
              onAddMember(picked);
              setPicked("");
              setAdding(false);
            }}
            disabled={!picked || busy}
            className="btn btn-primary text-xs px-3"
            style={{ width: "auto" }}
          >
            {teamsTab.add}
          </button>
        </div>
      ) : (
        <button
          onClick={() => setAdding(true)}
          className="text-xs px-3 py-1.5 rounded-lg font-bold"
          style={{ background: "var(--mint-100)", color: "var(--mint-700)" }}
        >
          <IconLabel name="plus">{teamsTab.addPlayer}</IconLabel>
        </button>
      )}
    </div>
  );
}
