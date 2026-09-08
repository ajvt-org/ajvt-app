"use client";

import IconLabel from "@/components/IconLabel";
import Icon from "@/components/Icon";
import type { TeamHandle } from "@/lib/myTeamServer";
import { teamBuilder as texts } from "@/lib/texts";

const ACCEPT = { background: "var(--mint-600)", color: "white" };
const DECLINE = { background: "#fee2e2", color: "#991b1b" };

export default function TeamInvitations({
  invitations,
  busy,
  onAnswer,
}: {
  invitations: TeamHandle[];
  busy: boolean;
  onAnswer: (teamId: string, accept: boolean) => void;
}) {
  if (invitations.length === 0) return null;

  return (
    <div className="space-y-1.5">
      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
        <Icon name="bell" size={12} className="icon-inline" /> {texts.invitationsHeading}
      </p>
      {invitations.map((team) => (
        <div
          key={team.id}
          className="rounded-xl p-2 flex flex-wrap items-center gap-2"
          style={{ background: "var(--mint-50)" }}
        >
          <span className="text-xs font-bold grow basis-32" style={{ color: "var(--text-main)" }}>
            {texts.invitedBy(team.name)}
          </span>
          <button
            onClick={() => onAnswer(team.id, true)}
            disabled={busy}
            aria-label={texts.acceptOf(team.name)}
            className="btn btn-sm shrink-0"
            style={{ ...ACCEPT, fontSize: "0.75rem" }}
          >
            <IconLabel name="check">{texts.accept}</IconLabel>
          </button>
          <button
            onClick={() => onAnswer(team.id, false)}
            disabled={busy}
            aria-label={texts.declineOf(team.name)}
            className="btn btn-sm shrink-0"
            style={{ ...DECLINE, fontSize: "0.75rem" }}
          >
            {texts.decline}
          </button>
        </div>
      ))}
    </div>
  );
}
