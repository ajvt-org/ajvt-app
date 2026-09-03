"use client";

import Link from "next/link";
import ArrowLabel from "@/components/ArrowLabel";
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

const ACTION = "btn btn-sm text-xs shrink-0";

export default function RosterRow({
  entry,
  suspended,
  captain,
  busy,
  onToggleCaptain,
  onApprove,
  onRemove,
}: {
  entry: TeamMemberEntry;
  suspended: boolean;
  captain: boolean;
  busy: boolean;
  onToggleCaptain: () => void;
  onApprove: () => void;
  onRemove: () => void;
}) {
  const { member, status } = entry;
  const pending = status === "PENDING";

  return (
    <div
      className="rounded-xl p-2 w-full flex flex-wrap items-center gap-2 sm:grid sm:grid-cols-[minmax(0,1fr)_auto] sm:gap-3"
      style={{ background: pending ? PENDING : captain ? CAPTAIN : ACTIVE }}
    >
      <Link
        href={`/admin/members/${member.id}`}
        aria-label={teamsTab.openCardOf(member.fullName)}
        className="flex items-start gap-2 min-w-0 grow basis-40 text-start"
      >
        <span className="flex h-5 items-center shrink-0">
          <PlayerAvatar photo={member.photo} fullName={member.fullName} size={32} />
        </span>
        <span className="min-w-0 flex-1 flex flex-wrap items-center gap-x-2 gap-y-1">
          <span
            className="text-sm font-bold leading-5"
            style={{ color: "var(--text-main)", overflowWrap: "anywhere" }}
          >
            {member.fullName}
          </span>
          <span
            className="text-xs font-bold whitespace-nowrap"
            style={{ color: "var(--mint-700)" }}
          >
            <ArrowLabel>{teamsTab.openCard}</ArrowLabel>
          </span>
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
      </Link>
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
          className={ACTION}
          style={DESTRUCTIVE}
        >
          <IconLabel name="close">{pending ? teamsTab.reject : teamsTab.remove}</IconLabel>
        </button>
      </div>
    </div>
  );
}
