"use client";

import { useCallback, useEffect, useState } from "react";
import Icon from "@/components/Icon";
import IconLabel from "@/components/IconLabel";
import { useToast } from "@/components/Toast";
import { api, errorMessage } from "@/lib/api";
import { rosterFault, squadLabel } from "@/lib/squadSize";
import type { MyTeamView } from "@/lib/myTeamServer";
import type { Team } from "./activityTypes";
import { activityRegistration, teamBuilder as texts } from "@/lib/texts";

const PICK = {
  background: "white",
  color: "var(--mint-700)",
  border: "1px solid var(--mint-200)",
};
const DESTRUCTIVE = { color: "#991b1b" };

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
  const [name, setName] = useState("");
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

  function createTeam() {
    return run(async () => {
      await api.post("/api/teams", { activityId, name });
      setName("");
    }, texts.created);
  }

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

  if (!view) return null;

  const mine = view.team;
  const seat = mine?.members.find((m) => m.userId === viewerId) ?? null;
  const active = mine ? mine.members.filter((m) => m.status === "ACTIVE").length : 0;
  const label = squadLabel(view.squad);
  const short = mine !== null && rosterFault(active, view.squad) === "short";

  return (
    <div className="mt-1.5 space-y-2">
      {mine && seat?.status === "ACTIVE" ? (
        <>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            <Icon name="flag" size={12} className="icon-inline" /> {texts.yourTeam}
          </p>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="badge badge-active">
              <IconLabel name="check" size={11}>
                {mine.name}
              </IconLabel>
            </span>
            {mine.captainUserId === viewerId && (
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
                {texts.rosterCount(active)}
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
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            {texts.teamLocked}
          </p>
        </>
      ) : mine && seat ? (
        <>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            <Icon name="flag" size={12} className="icon-inline" /> {texts.pickTeam}
          </p>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="badge badge-pending">
              <IconLabel name="clock" size={11}>
                {mine.name}
              </IconLabel>
            </span>
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
              {texts.awaitingApproval}
            </span>
            <button
              onClick={() => cancelRequest(mine.id)}
              disabled={busy}
              className="text-xs font-bold"
              style={DESTRUCTIVE}
            >
              {texts.cancelRequest}
            </button>
          </div>
        </>
      ) : (
        <>
          <label
            htmlFor={`new-team-${activityId}`}
            className="block text-xs"
            style={{ color: "var(--text-muted)" }}
          >
            <Icon name="flag" size={12} className="icon-inline" /> {texts.createHeading}
          </label>
          <div className="flex items-stretch gap-1.5">
            <input
              id={`new-team-${activityId}`}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={texts.namePlaceholder}
              maxLength={40}
              className="input input-sm min-w-0 flex-1"
            />
            <button
              onClick={createTeam}
              disabled={busy || !name.trim()}
              className="btn btn-primary btn-sm shrink-0"
            >
              {busy ? "..." : <IconLabel name="plus">{texts.create}</IconLabel>}
            </button>
          </div>
          {teams.length > 0 && (
            <>
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                {texts.orJoin}
              </p>
              <div className="flex flex-wrap items-center gap-1.5">
                {teams.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => askToJoin(t.id)}
                    disabled={busy}
                    className="text-xs px-2.5 py-1 rounded-lg font-bold"
                    style={PICK}
                  >
                    {t.name}
                  </button>
                ))}
              </div>
            </>
          )}
        </>
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
