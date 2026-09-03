"use client";

import Icon from "@/components/Icon";
import PlayerAvatar from "@/components/tournament/PlayerAvatar";
import type { TeamMemberEntry } from "./types";
import { teamsTab } from "@/lib/texts";

const ACTIVE = { background: "var(--mint-100)", color: "var(--mint-700)" };
const PENDING = { background: "#fef3c7", color: "#92400e" };

export default function RosterChip({
  entry,
  suspended,
  busy,
  onRename,
  onApprove,
  onRemove,
}: {
  entry: TeamMemberEntry;
  suspended: boolean;
  busy: boolean;
  onRename: () => void;
  onApprove: () => void;
  onRemove: () => void;
}) {
  const { member, status } = entry;
  const pending = status === "PENDING";
  const tone = pending ? PENDING : ACTIVE;

  return (
    <div
      className="flex items-center gap-1 rounded-full ps-1.5 pe-1 py-1 w-full sm:w-auto sm:max-w-full"
      style={{ background: tone.background }}
    >
      <button
        onClick={onRename}
        aria-label={teamsTab.renameOf(member.fullName)}
        className="flex items-center gap-1.5 min-w-0 flex-1 sm:flex-none text-start"
        style={{ color: "var(--text-main)" }}
      >
        <PlayerAvatar photo={member.photo} fullName={member.fullName} size={26} />
        <span className="text-sm font-bold truncate">{member.fullName}</span>
        {suspended && (
          <span className="shrink-0" style={{ color: "#991b1b" }}>
            <Icon name="ban" size={14} />
          </span>
        )}
        {pending && (
          <span className="shrink-0" style={{ color: tone.color }}>
            <Icon name="clock" size={14} />
          </span>
        )}
      </button>
      {pending && (
        <button
          onClick={onApprove}
          disabled={busy}
          aria-label={teamsTab.acceptOf(member.fullName)}
          className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
          style={{ background: "var(--mint-600)", color: "white" }}
        >
          <Icon name="check" size={14} />
        </button>
      )}
      <button
        onClick={onRemove}
        disabled={busy}
        aria-label={
          pending ? teamsTab.rejectOf(member.fullName) : teamsTab.removeOf(member.fullName)
        }
        className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
        style={pending ? { background: "#fee2e2", color: "#991b1b" } : { color: "#991b1b" }}
      >
        <Icon name="close" size={14} />
      </button>
    </div>
  );
}
