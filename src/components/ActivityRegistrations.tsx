"use client";

import { useState } from "react";
import Icon from "@/components/Icon";
import IconLabel from "@/components/IconLabel";
import { useToast } from "@/components/Toast";
import { api, errorMessage } from "@/lib/api";
import TeamBuilder from "./TeamBuilder";
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
  const teamChosenAtRegistration =
    registration?.status === "PENDING" && registration.chosenTeamId
      ? (activity.joinableTeams.find((t) => t.id === registration.chosenTeamId)?.name ?? null)
      : null;
  const full = activity.capacity !== null && activity.registrantCount >= activity.capacity;
  const settled = registration && registration.status !== "REJECTED";
  const hasTeamsToJoin = activity.joinableTeams.length > 0;
  const mayBuildATeam = activity.isTournament && activity.playersBuildTeams;

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

  function openGroupBeforeAnyAwait() {
    if (activity.whatsappLink) window.open(activity.whatsappLink, "_blank", "noopener,noreferrer");
  }

  function registerVolunteer() {
    openGroupBeforeAnyAwait();
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
      return;
    }
  }

  return (
    <>
      <div className="space-y-1.5">
        <div className="flex flex-col items-stretch gap-2 text-xs">
          {settled ? (
            <div className="space-y-1">
              <div className="flex items-center justify-center gap-2 py-1">
                <span className={`badge ${STATUS_CLASS[registration!.status]}`}>
                  <IconLabel name={STATUS_LABEL[registration!.status].icon} size={11}>
                    {STATUS_LABEL[registration!.status].text}
                  </IconLabel>
                </span>
                {registration!.status === "PENDING" && (
                  <button
                    onClick={cancelPending}
                    className="font-bold"
                    style={{ color: "#991b1b" }}
                  >
                    {activityRegistration.cancel}
                  </button>
                )}
              </div>
              {teamChosenAtRegistration && (
                <p className="text-center" style={{ color: "var(--text-muted)" }}>
                  <IconLabel name="flag" size={12}>
                    {activityRegistration.chosenTeamPending(teamChosenAtRegistration)}
                  </IconLabel>
                </p>
              )}
            </div>
          ) : !member.canJoinNew ? (
            <p className="text-center py-1" style={{ color: "var(--text-muted)" }}>
              <IconLabel name="hourglass">{texts.renewToJoin}</IconLabel>
            </p>
          ) : activity.isOpen && !full ? (
            <>
              {activity.isTournament && !activity.isVolunteer && hasTeamsToJoin && (
                <div
                  className="rounded-xl p-2.5 mb-1 space-y-1.5"
                  style={{ background: "var(--mint-50)", border: "1px solid var(--mint-100)" }}
                >
                  <label
                    htmlFor={`choose-team-${activity.id}`}
                    className="block text-sm font-bold"
                    style={{ color: "var(--text-main)" }}
                  >
                    <IconLabel name="flag" size={14}>
                      {activityRegistration.chooseTeamAtRegistration}
                    </IconLabel>
                  </label>
                  <select
                    id={`choose-team-${activity.id}`}
                    className="input input-sm w-full"
                    value={chosenTeamId}
                    onChange={(e) => setChosenTeamId(e.target.value)}
                    style={{ backgroundColor: "white" }}
                  >
                    <option value="">{activityRegistration.noTeamYet}</option>
                    {activity.joinableTeams.map((t) => (
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

        {registration?.status === "ACTIVE" && mayBuildATeam && (
          <TeamBuilder
            activityId={activity.id}
            viewerId={member.id}
            teams={activity.joinableTeams}
            onChanged={onReload}
          />
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
