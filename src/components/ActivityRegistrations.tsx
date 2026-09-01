"use client";

import { useState } from "react";
import Icon from "@/components/Icon";
import IconLabel from "@/components/IconLabel";
import { useToast } from "@/components/Toast";
import { api, errorMessage } from "@/lib/api";
import { STATUS_CLASS, STATUS_LABEL, type Activity, type EligibleMember } from "./activityTypes";
import { activityRegistration, memberActivities as texts } from "@/lib/texts";

export default function ActivityRegistrations({
  member,
  activity,
  onReload,
}: {
  member: EligibleMember;
  activity: Activity;
  onReload: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [chosenTeamId, setChosenTeamId] = useState("");
  const showToast = useToast();

  const registration = member.registrations.find((r) => r.activityId === activity.id) || null;
  const team = member.teamMemberships.find((tm) => tm.activityId === activity.id) || null;
  const full = activity.capacity !== null && activity.registrantCount >= activity.capacity;
  const settled = registration && registration.status !== "REJECTED";

  async function run(action: () => Promise<unknown>, done: string) {
    setError("");
    setBusy(true);
    try {
      await action();
      showToast(done);
      onReload();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  function pickTeam(teamId: string) {
    return run(
      () => api.post(`/api/teams/${teamId}/join`, { userId: member.id }),
      activityRegistration.joinRequested,
    );
  }

  function leaveTeam(teamId: string) {
    return run(
      () => api.del(`/api/teams/${teamId}/join`, { userId: member.id }),
      activityRegistration.requestCancelled,
    );
  }

  function register() {
    return run(
      () =>
        api.post("/api/activities/register", {
          activityId: activity.id,
          userId: member.id,
          chosenTeamId: chosenTeamId || null,
        }),
      activity.isVolunteer ? activityRegistration.volunteered : activityRegistration.registered,
    );
  }

  function registerVolunteer() {
    // Open the WhatsApp group synchronously in the click handler — a browser popup
    // blocker would kill the redirect if it happened after the register() await below.
    if (activity.whatsappLink) window.open(activity.whatsappLink, "_blank", "noopener,noreferrer");
    register();
  }

  async function cancelPending() {
    try {
      await fetch("/api/activities/register", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: member.id, activityId: activity.id }),
      });
      showToast(activityRegistration.requestCancelled);
      onReload();
    } catch {
      // best-effort — the member can just try again
    }
  }

  return (
    <>
      {/* One tap — no payment, no form: membership already covers it */}
      <div className="space-y-1.5">
        <div className="flex flex-col items-stretch gap-2 text-xs">
          {settled ? (
            <div className="flex items-center justify-center gap-2 py-1">
              <span className={`badge ${STATUS_CLASS[registration!.status]}`}>
                <IconLabel name={STATUS_LABEL[registration!.status].icon} size={11}>
                  {STATUS_LABEL[registration!.status].text}
                </IconLabel>
              </span>
              {registration!.status === "PENDING" && (
                <button onClick={cancelPending} className="font-bold" style={{ color: "#991b1b" }}>
                  {activityRegistration.cancel}
                </button>
              )}
            </div>
          ) : !member.canJoinNew ? (
            <p className="text-center py-1" style={{ color: "var(--text-muted)" }}>
              <IconLabel name="hourglass">{texts.renewToJoin}</IconLabel>
            </p>
          ) : activity.isOpen && !full ? (
            <>
              {activity.isTournament && !activity.isVolunteer && activity.teams.length > 0 && (
                <div>
                  <label
                    htmlFor={`choose-team-${activity.id}`}
                    className="block text-xs mb-1"
                    style={{ color: "var(--text-muted)" }}
                  >
                    <Icon name="flag" size={12} className="icon-inline" />{" "}
                    {activityRegistration.chooseTeamAtRegistration}
                  </label>
                  <select
                    id={`choose-team-${activity.id}`}
                    className="input input-sm"
                    value={chosenTeamId}
                    onChange={(e) => setChosenTeamId(e.target.value)}
                  >
                    <option value="">{activityRegistration.noTeamYet}</option>
                    {activity.teams.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <button
                onClick={activity.isVolunteer ? registerVolunteer : register}
                disabled={busy}
                className="btn btn-primary"
              >
                {busy ? (
                  "..."
                ) : registration?.status === "REJECTED" ? (
                  <IconLabel name="refresh">{activityRegistration.retry}</IconLabel>
                ) : activity.isVolunteer ? (
                  <IconLabel name="handshake">{activityRegistration.volunteer}</IconLabel>
                ) : (
                  <IconLabel name="pencil">{activityRegistration.register}</IconLabel>
                )}
              </button>
            </>
          ) : (
            <span className="text-xs text-center py-2" style={{ color: "var(--text-muted)" }}>
              {!activity.isOpen ? activityRegistration.closed : activityRegistration.full}
            </span>
          )}
        </div>

        {registration?.status === "REJECTED" && registration.rejectionReason && (
          <p className="text-xs" style={{ color: "#991b1b" }}>
            {activityRegistration.lastRejection(registration.rejectionReason)}
          </p>
        )}

        {registration?.status === "ACTIVE" &&
          activity.isTournament &&
          activity.teams.length > 0 && (
            <div className="mt-1.5">
              <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>
                <Icon name="flag" size={12} className="icon-inline" />{" "}
                {team?.status === "ACTIVE"
                  ? `${activityRegistration.yourTeam}:`
                  : `${activityRegistration.pickTeam}:`}
              </p>
              {team?.status === "ACTIVE" ? (
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="badge badge-active">
                    <IconLabel name="check" size={11}>
                      {team.teamName}
                    </IconLabel>
                  </span>
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {activityRegistration.teamLocked}
                  </span>
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-1.5">
                  {activity.teams.map((t) => {
                    const mine = team?.teamId === t.id;
                    return (
                      <button
                        key={t.id}
                        onClick={() => pickTeam(t.id)}
                        disabled={busy || mine}
                        className="text-xs px-2.5 py-1 rounded-lg font-bold"
                        style={{
                          background: mine ? "var(--mint-600)" : "white",
                          color: mine ? "white" : "var(--mint-700)",
                          border: "1px solid var(--mint-200)",
                        }}
                      >
                        {mine && <Icon name="clock" size={11} className="icon-inline" />}
                        {t.name}
                      </button>
                    );
                  })}
                  {team && (
                    <>
                      <span className="badge badge-pending" style={{ fontSize: "10px" }}>
                        <IconLabel name="clock">{activityRegistration.awaitingApproval}</IconLabel>
                      </span>
                      <button
                        onClick={() => leaveTeam(team.teamId)}
                        disabled={busy}
                        className="text-xs font-bold"
                        style={{ color: "#991b1b" }}
                      >
                        {activityRegistration.cancelRequest}
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
      </div>
      {error && (
        <div
          className="p-2.5 rounded-xl text-xs font-semibold mt-2"
          style={{ background: "#fee2e2", color: "#991b1b" }}
        >
          <Icon name="warning" size={13} className="icon-inline" /> {error}
        </div>
      )}
    </>
  );
}
