"use client";

import { useState } from "react";
import Icon from "@/components/Icon";
import IconLabel from "@/components/IconLabel";
import ConfirmDialog from "@/components/ConfirmDialog";
import ConfirmDeleteDialog from "@/components/ConfirmDeleteDialog";
import PlayerAvatar from "@/components/tournament/PlayerAvatar";
import { rosterFault, squadLabel, teamIsFull, type SquadSize } from "@/lib/squadSize";
import type { Candidate, MyTeamMember, MyTeamView } from "@/lib/myTeamServer";
import { teamBuilder as texts } from "@/lib/texts";

const WAITING = { background: "#fef3c7" };
const SEATED = { background: "var(--mint-50)" };
const ACCEPT = { background: "var(--mint-600)", color: "white" };
const HANDOVER = { background: "var(--mint-100)", color: "var(--mint-700)" };
const DESTRUCTIVE = { background: "#fee2e2", color: "#991b1b" };

type Ask =
  | { kind: "handover"; userId: string; fullName: string }
  | { kind: "remove"; userId: string; fullName: string }
  | { kind: "disband" }
  | { kind: "leave" };

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
  locked,
  busy,
  onInvite,
  onAnswerRequest,
  onRemove,
  onHandOver,
  onDisband,
  onLeave,
}: {
  team: NonNullable<MyTeamView["team"]>;
  candidates: Candidate[];
  squad: SquadSize;
  viewerId: string;
  locked: boolean;
  busy: boolean;
  onInvite: (userId: string) => void;
  onAnswerRequest: (userId: string, accept: boolean) => void;
  onRemove: (userId: string) => void;
  onHandOver: (userId: string) => void;
  onDisband: () => void;
  onLeave: () => void;
}) {
  const [pick, setPick] = useState("");
  const [ask, setAsk] = useState<Ask | null>(null);
  const leads = team.captainUserId === viewerId;
  const captain = leads && !locked;
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
        {leads && (
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
                        onClick={() =>
                          setAsk({
                            kind: "handover",
                            userId: entry.userId,
                            fullName: entry.fullName,
                          })
                        }
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
                        setAsk({ kind: "remove", userId: entry.userId, fullName: entry.fullName });
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
        {locked ? texts.lockedAtStart : texts.freeUntilStart}
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
          onClick={() => setAsk({ kind: "disband" })}
          disabled={busy}
          className="text-xs font-bold"
          style={{ color: "#991b1b" }}
        >
          {texts.disband}
        </button>
      )}

      {!leads && !locked && (
        <button
          onClick={() => setAsk({ kind: "leave" })}
          disabled={busy}
          className="text-xs font-bold"
          style={{ color: "#991b1b" }}
        >
          {texts.leave}
        </button>
      )}

      {ask?.kind === "handover" && (
        <ConfirmDialog
          title={texts.makeCaptain(ask.fullName)}
          message={texts.confirmHandover(ask.fullName)}
          confirmLabel={texts.makeCaptain(ask.fullName)}
          loading={busy}
          onConfirm={() => {
            setAsk(null);
            onHandOver(ask.userId);
          }}
          onClose={() => setAsk(null)}
        />
      )}

      {ask?.kind === "remove" && (
        <ConfirmDialog
          title={texts.removePlayer(ask.fullName)}
          message={texts.confirmRemove(ask.fullName)}
          confirmLabel={texts.removePlayer(ask.fullName)}
          danger
          loading={busy}
          onConfirm={() => {
            setAsk(null);
            onRemove(ask.userId);
          }}
          onClose={() => setAsk(null)}
        />
      )}

      {ask?.kind === "leave" && (
        <ConfirmDialog
          title={texts.leave}
          message={texts.confirmLeave}
          confirmLabel={texts.leave}
          danger
          loading={busy}
          onConfirm={() => {
            setAsk(null);
            onLeave();
          }}
          onClose={() => setAsk(null)}
        />
      )}

      {ask?.kind === "disband" && (
        <ConfirmDeleteDialog
          name={team.name}
          consequence={texts.confirmDisband}
          title={texts.disband}
          nameField={texts.disbandNameField}
          confirmLabel={texts.disband}
          loading={busy}
          onConfirm={() => {
            setAsk(null);
            onDisband();
          }}
          onClose={() => setAsk(null)}
        />
      )}
    </div>
  );
}
