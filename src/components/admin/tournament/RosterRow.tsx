"use client";

import Link from "next/link";
import Icon from "@/components/Icon";
import IconLabel from "@/components/IconLabel";
import PlayerAvatar from "@/components/tournament/PlayerAvatar";
import type { TeamMemberEntry } from "./types";
import { discipline, teamsTab } from "@/lib/texts";
import { memberCardHref } from "@/lib/adminBackLink";
import { useAdminOrigin } from "@/components/admin/adminOrigin";

const ACTIVE = "var(--mint-50)";
const PENDING = "#fef3c7";

const MINT_ACTION = { background: "var(--mint-100)", color: "var(--mint-700)" };
const MINT_ON = { background: "var(--mint-600)", color: "white" };
const DESTRUCTIVE = { background: "#fee2e2", color: "#991b1b" };
const CAPTAIN_EDGE = "var(--copper-500)";

const ACTION = "btn btn-sm shrink-0";
const ICON_ACTION = "btn btn-sm btn-icon shrink-0";
const ACTION_SIZE = { fontSize: "0.75rem" };

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
  const from = useAdminOrigin();

  function confirmThenRemove() {
    const question = pending
      ? teamsTab.confirmReject(member.fullName)
      : teamsTab.confirmRemove(member.fullName);
    if (confirm(question)) onRemove();
  }

  return (
    <div
      className="rounded-xl p-2 w-full flex flex-wrap items-center gap-2 sm:grid sm:grid-cols-[minmax(0,1fr)_auto] sm:gap-3"
      style={{
        background: pending ? PENDING : ACTIVE,
        border: `2px solid ${captain ? CAPTAIN_EDGE : "transparent"}`,
      }}
    >
      <div className="min-w-0 grow basis-40 flex flex-wrap items-center gap-x-2 gap-y-1">
        <Link
          href={memberCardHref(member.id, from)}
          aria-label={teamsTab.openCardOf(member.fullName)}
          className="flex items-start gap-2 min-w-0 text-start"
        >
          <span className="h-6 flex items-center shrink-0">
            <PlayerAvatar photo={member.photo} fullName={member.fullName} size={32} />
          </span>
          <span
            className="text-base font-bold leading-6 optical-name"
            style={{ color: "var(--mint-700)", overflowWrap: "anywhere" }}
          >
            {member.fullName}
          </span>
        </Link>
        {captain && (
          <span className="h-6 flex items-center shrink-0" aria-hidden>
            <Icon name="star" size={16} className="icon-optical" color="var(--copper-700)" />
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
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {pending && (
          <button
            onClick={onApprove}
            disabled={busy}
            aria-label={teamsTab.acceptOf(member.fullName)}
            className={ACTION}
            style={{ ...ACTION_SIZE, ...MINT_ON }}
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
          style={{ ...ACTION_SIZE, ...(captain ? MINT_ON : MINT_ACTION) }}
        >
          <IconLabel name="star">
            {captain ? teamsTab.clearCaptainAction : teamsTab.makeCaptainAction}
          </IconLabel>
        </button>
        <button
          onClick={confirmThenRemove}
          disabled={busy}
          aria-label={
            pending ? teamsTab.rejectOf(member.fullName) : teamsTab.removeOf(member.fullName)
          }
          className={ICON_ACTION}
          style={DESTRUCTIVE}
        >
          <Icon name="close" size={18} />
        </button>
      </div>
    </div>
  );
}
