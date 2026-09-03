"use client";

import Icon from "@/components/Icon";
import IconLabel from "@/components/IconLabel";
import PlayerAvatar from "@/components/tournament/PlayerAvatar";
import type { TeamMemberEntry } from "./types";
import { discipline, teamsTab } from "@/lib/texts";

const ACTIVE = "var(--mint-50)";
const PENDING = "#fef3c7";
const CAPTAIN = "var(--mint-100)";

const MINT_ACTION = { background: "var(--mint-100)", color: "var(--mint-700)" };
const MINT_ON = { background: "var(--mint-600)", color: "white" };
const DESTRUCTIVE = { background: "#fee2e2", color: "#991b1b" };

const ACTION = "text-xs font-bold px-3 py-1.5 rounded-lg shrink-0";

export default function RosterRow({
  entry,
  suspended,
  captain,
  busy,
  onRename,
  onToggleCaptain,
  onApprove,
  onRemove,
}: {
  entry: TeamMemberEntry;
  suspended: boolean;
  captain: boolean;
  busy: boolean;
  onRename: () => void;
  onToggleCaptain: () => void;
  onApprove: () => void;
  onRemove: () => void;
}) {
  const { member, status } = entry;
  const pending = status === "PENDING";

  return (
    <div
      className="rounded-xl p-2 space-y-2 w-full"
      style={{ background: pending ? PENDING : captain ? CAPTAIN : ACTIVE }}
    >
      <button
        onClick={onRename}
        aria-label={teamsTab.renameOf(member.fullName)}
        className="flex items-start gap-2 w-full text-start"
      >
        <PlayerAvatar photo={member.photo} fullName={member.fullName} size={32} />
        <span className="min-w-0 flex-1 space-y-1">
          <span
            className="block text-sm font-bold"
            style={{ color: "var(--text-main)", overflowWrap: "anywhere" }}
          >
            {member.fullName} <Icon name="pencil" size={12} className="icon-inline" />
          </span>
          {(captain || pending || suspended) && (
            <span className="flex flex-wrap items-center gap-1.5">
              {captain && (
                <span className="badge" style={MINT_ON}>
                  <IconLabel name="star">{teamsTab.captain}</IconLabel>
                </span>
              )}
              {pending && (
                <span className="badge badge-pending">
                  <IconLabel name="clock">{teamsTab.awaitingApproval}</IconLabel>
                </span>
              )}
              {suspended && (
                <span className="badge" style={DESTRUCTIVE}>
                  <IconLabel name="ban">{discipline.suspendedBadge}</IconLabel>
                </span>
              )}
            </span>
          )}
        </span>
      </button>
      <div className="flex flex-wrap items-center gap-2">
        {pending && (
          <button
            onClick={onApprove}
            disabled={busy}
            aria-label={teamsTab.acceptOf(member.fullName)}
            className={ACTION}
            style={MINT_ON}
          >
            <IconLabel name="check">{teamsTab.accept}</IconLabel>
          </button>
        )}
        <button
          onClick={onToggleCaptain}
          disabled={busy}
          aria-label={
            captain ? teamsTab.clearCaptain(member.fullName) : teamsTab.makeCaptain(member.fullName)
          }
          aria-pressed={captain}
          className={ACTION}
          style={captain ? MINT_ON : MINT_ACTION}
        >
          <IconLabel name="star">
            {captain ? teamsTab.clearCaptainAction : teamsTab.makeCaptainAction}
          </IconLabel>
        </button>
        <button
          onClick={onRemove}
          disabled={busy}
          aria-label={
            pending ? teamsTab.rejectOf(member.fullName) : teamsTab.removeOf(member.fullName)
          }
          className={`${ACTION} ms-auto`}
          style={DESTRUCTIVE}
        >
          <IconLabel name="close">{pending ? teamsTab.reject : teamsTab.remove}</IconLabel>
        </button>
      </div>
    </div>
  );
}
