"use client";

import Link from "next/link";
import PhotoUpload from "@/components/PhotoUpload";
import PlayerAvatar from "@/components/tournament/PlayerAvatar";
import { useState } from "react";
import type { RosterMember, Team } from "./types";
import { displayTeamName, squadLabel } from "@/lib/teamSize";
import { squadBreaches, type SquadSettings } from "@/lib/squadRules";
import { api, errorMessage } from "@/lib/api";
import IconLabel from "@/components/IconLabel";
import NumericRanges from "@/components/NumericRanges";
import ErrorNotice from "@/components/form/ErrorNotice";
import TeamCard from "./TeamCard";
import { teamsTab } from "@/lib/texts";
import { matchingMembers, matchingPeople, matchingTeams } from "./teamSearch";
import { useOpenTeam } from "./useOpenTeam";
import { memberCardHref } from "@/lib/adminBackLink";
import { useAdminOrigin } from "@/components/admin/adminOrigin";

export default function TeamsTab({
  activityId,
  teams,
  settings,
  roster,
  suspendedIds,
  onChange,
}: {
  activityId: string;
  teams: Team[];
  settings: SquadSettings;
  roster: RosterMember[];
  suspendedIds: string[];
  onChange: () => void;
}) {
  const [query, setQuery] = useState("");
  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamLogo, setNewTeamLogo] = useState("");
  const [loadingAction, setLoadingAction] = useState(false);
  const [error, setError] = useState("");

  const unassigned = roster.filter((m) => !m.team);
  const squadText = squadLabel(settings.squad);
  const from = useAdminOrigin();

  function shownName(team: Team): string {
    return displayTeamName(
      {
        id: team.id,
        name: team.name,
        autoNamed: team.autoNamed,
        memberNames: team.members.map((m) => m.member.fullName),
      },
      settings.squad,
    );
  }

  const rows = teams.map((team) => ({
    team,
    name: shownName(team),
    players: team.members.map((m) => m.member.fullName),
  }));
  const shownTeams = matchingTeams(rows, query).map((row) => row.team);
  const shownUnassigned = matchingPeople(unassigned, query);
  const searching = query.trim().length > 0;

  const rosters = new Map(
    shownTeams.map((team) => [team.id, matchingMembers(team.members, query)]),
  );
  const holdingAMatch = shownTeams
    .filter((team) => (rosters.get(team.id) ?? team.members).length < team.members.length)
    .map((team) => team.id);
  const { isOpen, toggle } = useOpenTeam(holdingAMatch);

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

  function setFromHomeVillage(teamId: string, fromHomeVillage: boolean) {
    run(() => api.patch(`/api/admin/teams/${teamId}`, { fromHomeVillage }));
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
      <ErrorNotice error={error} />

      <div className="card p-2.5">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={teamsTab.searchPlaceholder}
          aria-label={teamsTab.searchLabel}
          className="input input-sm w-full"
          style={{ background: "white" }}
        />
      </div>

      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <p className="text-sm font-bold" style={{ color: "var(--text-main)" }}>
          {searching
            ? teamsTab.teamCountShown(shownTeams.length, teams.length)
            : teamsTab.teamCount(teams.length)}
        </p>
        {squadText !== null && (
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            <NumericRanges>{teamsTab.squadSize(squadText)}</NumericRanges>
          </p>
        )}
      </div>

      {searching && shownTeams.length === 0 && shownUnassigned.length === 0 && (
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          {teamsTab.noMatch}
        </p>
      )}

      {shownTeams.map((team) => (
        <TeamCard
          key={team.id}
          team={team}
          shownName={shownName(team)}
          settings={settings}
          breaches={squadBreaches(
            (rosters.get(team.id) ?? team.members).map((m) => ({
              id: m.member.id,
              village: m.member.village,
            })),
            team,
            settings,
          )}
          members={rosters.get(team.id) ?? team.members}
          open={isOpen(team.id)}
          candidates={unassigned}
          suspendedIds={suspendedIds}
          busy={loadingAction}
          onToggle={(summary) => toggle(team.id, summary)}
          onRenameTeam={(name) => renameTeam(team.id, name)}
          onDeleteTeam={() => deleteTeam(team.id)}
          onSetLogo={(filename) => setTeamLogo(team.id, filename)}
          onSetFromHomeVillage={(value) => setFromHomeVillage(team.id, value)}
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

      {shownUnassigned.length > 0 && (
        <div className="card p-4">
          <p className="text-sm font-bold mb-2" style={{ color: "var(--text-main)" }}>
            <IconLabel name="user">{teamsTab.unassigned(shownUnassigned.length)}</IconLabel>
          </p>
          <div className="flex flex-wrap gap-1.5">
            {shownUnassigned.map((m) => (
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
