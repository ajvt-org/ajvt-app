"use client";

import Link from "next/link";
import PhotoUpload from "@/components/PhotoUpload";
import PlayerAvatar from "@/components/tournament/PlayerAvatar";
import { useState } from "react";
import type { RosterMember, Team } from "./types";
import { displayTeamName } from "@/lib/teamSize";
import { api, errorMessage } from "@/lib/api";
import IconLabel from "@/components/IconLabel";
import TeamCard from "./TeamCard";
import { teamsTab } from "@/lib/texts";
import { memberCardHref } from "@/lib/adminBackLink";
import { useAdminOrigin } from "@/components/admin/adminOrigin";

export default function TeamsTab({
  activityId,
  teams,
  teamSize,
  roster,
  suspendedIds,
  onChange,
}: {
  activityId: string;
  teams: Team[];
  teamSize: number | null;
  roster: RosterMember[];
  suspendedIds: string[];
  onChange: () => void;
}) {
  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamLogo, setNewTeamLogo] = useState("");
  const [loadingAction, setLoadingAction] = useState(false);
  const [error, setError] = useState("");

  const unassigned = roster.filter((m) => !m.team);
  const from = useAdminOrigin();

  function shownName(team: Team): string {
    return displayTeamName(
      {
        id: team.id,
        name: team.name,
        autoNamed: team.autoNamed,
        memberNames: team.members.map((m) => m.member.fullName),
      },
      teamSize,
    );
  }

  async function run(action: () => Promise<unknown>) {
    setError("");
    setLoadingAction(true);
    try {
      await action();
      onChange();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoadingAction(false);
    }
  }

  function renameTeam(teamId: string, name: string) {
    run(() => api.patch(`/api/admin/teams/${teamId}`, { name }));
  }

  function setCaptain(teamId: string, captainUserId: string | null) {
    run(() => api.patch(`/api/admin/teams/${teamId}`, { captainUserId }));
  }

  async function setTeamLogo(teamId: string, logo: string) {
    await api.patch(`/api/admin/teams/${teamId}`, { logo: logo || null });
    onChange();
  }

  async function createTeam(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    await run(async () => {
      await api.post(`/api/admin/activities/${activityId}/teams`, {
        name: newTeamName,
        logo: newTeamLogo || null,
      });
      setNewTeamName("");
      setNewTeamLogo("");
    });
  }

  function deleteTeam(teamId: string) {
    if (!confirm(teamsTab.confirmDelete)) return;
    run(() => api.del(`/api/admin/teams/${teamId}`));
  }

  function addMember(teamId: string, userId: string) {
    if (!userId) return;
    run(() => api.post(`/api/admin/teams/${teamId}/members`, { userId }));
  }

  function removeMember(teamId: string, memberId: string) {
    run(() => api.del(`/api/admin/teams/${teamId}/members/${memberId}`));
  }

  function approveMember(teamId: string, memberId: string) {
    run(() => api.patch(`/api/admin/teams/${teamId}/members/${memberId}`));
  }

  return (
    <div className="space-y-4">
      {error && (
        <div
          className="p-3 rounded-xl text-sm font-semibold"
          style={{ background: "#fee2e2", color: "#991b1b" }}
        >
          <IconLabel name="warning">{error}</IconLabel>
        </div>
      )}

      <p className="text-sm font-bold" style={{ color: "var(--text-main)" }}>
        {teamsTab.teamCount(teams.length)}
      </p>

      {teams.map((team) => (
        <TeamCard
          key={team.id}
          team={team}
          shownName={shownName(team)}
          teamSize={teamSize}
          candidates={unassigned}
          suspendedIds={suspendedIds}
          busy={loadingAction}
          onRenameTeam={(name) => renameTeam(team.id, name)}
          onDeleteTeam={() => deleteTeam(team.id)}
          onSetLogo={(filename) => setTeamLogo(team.id, filename)}
          onSetCaptain={(memberId) => setCaptain(team.id, memberId)}
          onAddMember={(userId) => addMember(team.id, userId)}
          onApproveMember={(memberId) => approveMember(team.id, memberId)}
          onRemoveMember={(memberId) => removeMember(team.id, memberId)}
        />
      ))}

      <form onSubmit={createTeam} className="card p-4 space-y-2">
        <PhotoUpload
          photo={newTeamLogo || null}
          imageUrlPrefix="/api/files/team"
          variant="avatar"
          bare
          label={teamsTab.teamLogo}
          placeholderIcon="shield"
          onUpload={(filename) => setNewTeamLogo(filename)}
        />
        <input
          type="text"
          placeholder={teamsTab.newTeamName}
          value={newTeamName}
          onChange={(e) => setNewTeamName(e.target.value)}
          maxLength={40}
          required
          className="input"
        />
        <button type="submit" disabled={loadingAction} className="btn btn-primary text-sm">
          {loadingAction ? "..." : <IconLabel name="plus">{teamsTab.team}</IconLabel>}
        </button>
      </form>

      {unassigned.length > 0 && (
        <div className="card p-4">
          <p className="text-sm font-bold mb-2" style={{ color: "var(--text-main)" }}>
            <IconLabel name="user">{teamsTab.unassigned(unassigned.length)}</IconLabel>
          </p>
          <div className="flex flex-wrap gap-1.5">
            {unassigned.map((m) => (
              <Link
                key={m.id}
                href={memberCardHref(m.id, from)}
                aria-label={teamsTab.openCardOf(m.fullName)}
                className="badge badge-pending flex items-center gap-1.5"
              >
                <PlayerAvatar photo={m.photo} fullName={m.fullName} size={16} />
                {m.fullName}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
