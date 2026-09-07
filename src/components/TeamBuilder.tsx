"use client";

import { useCallback, useEffect, useState } from "react";
import Icon from "@/components/Icon";
import IconLabel from "@/components/IconLabel";
import { useToast } from "@/components/Toast";
import MyTeamCard from "@/components/team/MyTeamCard";
import NoTeamYet from "@/components/team/NoTeamYet";
import TeamInvitations from "@/components/team/TeamInvitations";
import { api, errorMessage } from "@/lib/api";
import type { MyTeamView } from "@/lib/myTeamServer";
import type { Team } from "./activityTypes";
import { activityRegistration, teamBuilder as texts } from "@/lib/texts";

export default function TeamBuilder({
  activityId,
  viewerId,
  teams,
  onChanged,
}: {
  activityId: string;
  viewerId: string;
  teams: Team[];
  onChanged: () => void;
}) {
  const [view, setView] = useState<MyTeamView | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const showToast = useToast();

  const load = useCallback(async () => {
    try {
      setView(await api.get<MyTeamView>(`/api/teams?activityId=${activityId}`));
    } catch {
      setView(null);
    }
  }, [activityId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  async function run(action: () => Promise<unknown>, done: string) {
    setError("");
    setBusy(true);
    try {
      await action();
      showToast(done);
      await load();
      onChanged();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  const createTeam = (name: string) =>
    run(() => api.post("/api/teams", { activityId, name }), texts.created);

  const askToJoin = (teamId: string) =>
    run(
      () => api.post(`/api/teams/${teamId}/join`, { userId: viewerId }),
      activityRegistration.joinRequested,
    );

  const cancelRequest = (teamId: string) =>
    run(
      () => api.del(`/api/teams/${teamId}/join`, { userId: viewerId }),
      activityRegistration.requestCancelled,
    );

  const answerInvitation = (teamId: string, accept: boolean) =>
    run(
      () => api.patch(`/api/teams/${teamId}/invites`, { accept }),
      accept ? texts.accepted : texts.declined,
    );

  const invite = (userId: string) =>
    run(() => api.post(`/api/teams/${view!.team!.id}/invites`, { userId }), texts.invited);

  if (!view) return null;

  return (
    <div className="mt-1.5 space-y-2.5">
      <TeamInvitations invitations={view.invitations} busy={busy} onAnswer={answerInvitation} />

      {view.team ? (
        <MyTeamCard
          team={view.team}
          candidates={view.candidates}
          squad={view.squad}
          viewerId={viewerId}
          busy={busy}
          onInvite={invite}
        />
      ) : view.request ? (
        <div className="space-y-2">
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            <Icon name="flag" size={12} className="icon-inline" /> {texts.pickTeam}
          </p>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="badge badge-pending">
              <IconLabel name="clock" size={11}>
                {view.request.name}
              </IconLabel>
            </span>
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
              {texts.awaitingApproval}
            </span>
            <button
              onClick={() => cancelRequest(view.request!.id)}
              disabled={busy}
              className="text-xs font-bold"
              style={{ color: "#991b1b" }}
            >
              {texts.cancelRequest}
            </button>
          </div>
        </div>
      ) : (
        <NoTeamYet
          activityId={activityId}
          teams={teams}
          busy={busy}
          onCreate={createTeam}
          onAskToJoin={askToJoin}
        />
      )}

      {error && (
        <div
          className="p-2.5 rounded-xl text-xs font-semibold"
          style={{ background: "#fee2e2", color: "#991b1b" }}
        >
          <Icon name="warning" size={13} className="icon-inline" /> {error}
        </div>
      )}
    </div>
  );
}
