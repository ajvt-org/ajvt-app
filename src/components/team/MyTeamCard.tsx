"use client";

import { useState } from "react";
import Icon from "@/components/Icon";
import IconLabel from "@/components/IconLabel";
import PlayerAvatar from "@/components/tournament/PlayerAvatar";
import { rosterFault, squadLabel, teamIsFull, type SquadSize } from "@/lib/squadSize";
import type { Candidate, MyTeamMember, MyTeamView } from "@/lib/myTeamServer";
import { teamBuilder as texts } from "@/lib/texts";

const WAITING = { background: "#fef3c7" };
const SEATED = { background: "var(--mint-50)" };
const ACCEPT = { background: "var(--mint-600)", color: "white" };
const HANDOVER = { background: "var(--mint-100)", color: "var(--mint-700)" };
const DESTRUCTIVE = { background: "#fee2e2", color: "#991b1b" };

function seatNote(kind: MyTeamMember["kind"]): string | null {
  if (kind === "invitation") return texts.waitingOnInvitation;
  if (kind === "request") return texts.waitingOnRequest;
  return null;
}

export default function MyTeamCard({
  team,
  candidates,
  squad,
  viewerId,
  busy,
  onInvite,
  onAnswerRequest,
  onRemove,
  onHandOver,
  onDisband,
}: {
  team: NonNullable<MyTeamView["team"]>;
  candidates: Candidate[];
  squad: SquadSize;
  viewerId: string;
  busy: boolean;
  onInvite: (userId: string) => void;
  onAnswerRequest: (userId: string, accept: boolean) => void;
  onRemove: (userId: string) => void;
  onHandOver: (userId: string) => void;
  onDisband: () => void;
}) {
  const [pick, setPick] = useState("");
  const captain = team.captainUserId === viewerId;
  const seated = team.members.filter((m) => m.kind === "member");
  const label = squadLabel(squad);
  const short = rosterFault(seated.length, squad) === "short";
  const full = teamIsFull(seated.length, squad);

  return (
    <div className="space-y-2">
      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
        <Icon name="flag" size={12} className="icon-inline" /> {texts.yourTeam}
      </p>
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="badge badge-active">
          <IconLabel name="check" size={11}>
            {team.name}
          </IconLabel>
        </span>
        {captain && (
          <span className="badge badge-pending">
            <IconLabel name="captain" size={11}>
              {texts.captain}
            </IconLabel>
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs">
        <span style={{ color: "var(--text-muted)" }}>
          <IconLabel name="users" size={12}>
            {texts.rosterCount(seated.length)}
          </IconLabel>
        </span>
        {label && <span style={{ color: "var(--text-muted)" }}>{texts.squadNeeds(label)}</span>}
        {short && (
          <span className="badge badge-pending">
            <IconLabel name="warning" size={11}>
              {texts.incomplete}
            </IconLabel>
          </span>
        )}
      </div>

      <ul className="space-y-1.5">
        {team.members.map((entry) => {
          const note = seatNote(entry.kind);
          return (
            <li
              key={entry.userId}
              className="rounded-xl p-1.5 flex flex-wrap items-center gap-x-2 gap-y-1"
              style={note ? WAITING : SEATED}
            >
              <span className="h-6 flex items-center shrink-0">
                <PlayerAvatar photo={entry.photo} fullName={entry.fullName} size={26} />
              </span>
              <span
                className="text-xs font-bold grow basis-24 optical-name"
                style={{ color: "var(--text-main)", overflowWrap: "anywhere" }}
              >
                {entry.fullName}
              </span>
              {entry.userId === team.captainUserId && (
                <span className="shrink-0 flex items-center" aria-label={texts.captainMark}>
                  <Icon name="captain" size={14} />
                </span>
              )}
              {note && (
                <span className="text-xs shrink-0" style={{ color: "#92400e" }}>
                  {note}
                </span>
              )}
              <span className="flex items-center gap-1.5 shrink-0 ms-auto">
                {captain && entry.kind === "request" && (
                  <button
                    onClick={() => onAnswerRequest(entry.userId, true)}
                    disabled={busy}
                    aria-label={texts.acceptPlayer(entry.fullName)}
                    className="btn btn-sm btn-icon shrink-0"
                    style={ACCEPT}
                  >
                    <Icon name="check" size={16} />
                  </button>
                )}
                {captain && entry.userId !== viewerId && (
                  <>
                    {entry.kind === "member" && (
                      <button
                        onClick={() => {
                          if (confirm(texts.confirmHandover(entry.fullName)))
                            onHandOver(entry.userId);
                        }}
                        disabled={busy}
                        aria-label={texts.makeCaptain(entry.fullName)}
                        className="btn btn-sm btn-icon shrink-0"
                        style={HANDOVER}
                      >
                        <Icon name="captain" size={16} />
                      </button>
                    )}
                    <button
                      onClick={() => {
                        if (entry.kind === "request") return onAnswerRequest(entry.userId, false);
                        if (confirm(texts.confirmRemove(entry.fullName))) onRemove(entry.userId);
                      }}
                      disabled={busy}
                      aria-label={
                        entry.kind === "request"
                          ? texts.declinePlayer(entry.fullName)
                          : texts.removePlayer(entry.fullName)
                      }
                      className="btn btn-sm btn-icon shrink-0"
                      style={DESTRUCTIVE}
                    >
                      <Icon name="close" size={16} />
                    </button>
                  </>
                )}
              </span>
            </li>
          );
        })}
      </ul>

      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
        {texts.teamLocked}
      </p>

      {captain && !full && (
        <div className="space-y-1.5">
          <label
            htmlFor={`invite-${team.id}`}
            className="block text-xs"
            style={{ color: "var(--text-muted)" }}
          >
            <Icon name="plus" size={12} className="icon-inline" /> {texts.inviteHeading}
          </label>
          {candidates.length === 0 ? (
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              {texts.noCandidates}
            </p>
          ) : (
            <div className="flex items-stretch gap-1.5">
              <select
                id={`invite-${team.id}`}
                value={pick}
                onChange={(e) => setPick(e.target.value)}
                className="input input-sm min-w-0 flex-1"
              >
                <option value="">{texts.invitePlaceholder}</option>
                {candidates.map((c) => (
                  <option key={c.userId} value={c.userId}>
                    {c.fullName}
                  </option>
                ))}
              </select>
              <button
                onClick={() => {
                  onInvite(pick);
                  setPick("");
                }}
                disabled={busy || !pick}
                className="btn btn-primary btn-sm shrink-0"
              >
                {busy ? "..." : texts.invite}
              </button>
            </div>
          )}
        </div>
      )}

      {captain && (
        <button
          onClick={() => {
            if (confirm(texts.confirmDisband)) onDisband();
          }}
          disabled={busy}
          className="text-xs font-bold"
          style={{ color: "#991b1b" }}
        >
          {texts.disband}
        </button>
      )}
    </div>
  );
}
