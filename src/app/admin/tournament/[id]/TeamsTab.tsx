"use client";

import PhotoUpload from "@/components/PhotoUpload";
import PlayerAvatar from "@/components/tournament/PlayerAvatar";
import TeamLogo from "@/components/tournament/TeamLogo";
import { useState } from "react";
import type { Group, RosterMember, Team, TournamentFormat } from "./types";
import { displayTeamName } from "@/lib/teamSize";
import GroupsPanel from "./GroupsPanel";
import { api, errorMessage } from "@/lib/api";
import Icon from "@/components/Icon";
import IconLabel from "@/components/IconLabel";

export default function TeamsTab({
  activityId,
  teams,
  groups,
  format,
  teamSize,
  roster,
  onChange,
}: {
  activityId: string;
  teams: Team[];
  groups: Group[];
  format: TournamentFormat;
  teamSize: number | null;
  roster: RosterMember[];
  onChange: () => void;
}) {
  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamGroup, setNewTeamGroup] = useState("");
  const [newTeamLogo, setNewTeamLogo] = useState("");
  const [loadingAction, setLoadingAction] = useState(false);

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
  const [error, setError] = useState("");
  const [addingTo, setAddingTo] = useState<string | null>(null);
  const [selectedMember, setSelectedMember] = useState<Record<string, string>>({});
  const [editingTeamId, setEditingTeamId] = useState<string | null>(null);
  const [editTeamName, setEditTeamName] = useState("");
  const [editingMemberId, setEditingMemberId] = useState<string | null>(null);
  const [editMemberName, setEditMemberName] = useState("");

  const unassigned = roster.filter((m) => !m.team);

  async function renameTeam(teamId: string) {
    if (!editTeamName.trim()) return;
    setLoadingAction(true);
    try {
      await api.patch(`/api/admin/teams/${teamId}`, { name: editTeamName });
      setEditingTeamId(null);
      onChange();
    } catch (e) {
      alert(errorMessage(e));
    } finally {
      setLoadingAction(false);
    }
  }

  async function renameMember(memberId: string) {
    if (!editMemberName.trim()) return;
    setLoadingAction(true);
    try {
      await api.patch(`/api/admin/members/${memberId}`, { fullName: editMemberName });
      setEditingMemberId(null);
      onChange();
    } catch (e) {
      alert(errorMessage(e));
    } finally {
      setLoadingAction(false);
    }
  }

  async function setTeamGroup(teamId: string, groupId: string) {
    setLoadingAction(true);
    try {
      await api.patch(`/api/admin/teams/${teamId}`, { groupId: groupId || null });
      onChange();
    } catch (e) {
      alert(errorMessage(e));
    } finally {
      setLoadingAction(false);
    }
  }

  async function setTeamLogo(teamId: string, logo: string) {
    await api.patch(`/api/admin/teams/${teamId}`, { logo: logo || null });
    onChange();
  }

  async function createTeam(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    setLoadingAction(true);
    try {
      await api.post(`/api/admin/activities/${activityId}/teams`, {
        name: newTeamName,
        groupId: newTeamGroup || null,
        logo: newTeamLogo || null,
      });
      setNewTeamName("");
      setNewTeamGroup("");
      setNewTeamLogo("");
      onChange();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoadingAction(false);
    }
  }

  async function deleteTeam(teamId: string) {
    if (!confirm("هل تريد حذف هذا الفريق؟")) return;
    setLoadingAction(true);
    try {
      await api.del(`/api/admin/teams/${teamId}`);
      onChange();
    } catch (e) {
      alert(errorMessage(e));
    } finally {
      setLoadingAction(false);
    }
  }

  async function addMember(teamId: string) {
    const memberId = selectedMember[teamId];
    if (!memberId) return;
    setError("");
    setLoadingAction(true);
    try {
      await api.post(`/api/admin/teams/${teamId}/members`, { memberId });
      setSelectedMember((p) => ({ ...p, [teamId]: "" }));
      setAddingTo(null);
      onChange();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setLoadingAction(false);
    }
  }

  async function removeMember(teamId: string, memberId: string) {
    setLoadingAction(true);
    try {
      await api.del(`/api/admin/teams/${teamId}/members/${memberId}`);
      onChange();
    } catch (e) {
      alert(errorMessage(e));
    } finally {
      setLoadingAction(false);
    }
  }

  async function approveMember(teamId: string, memberId: string) {
    setLoadingAction(true);
    try {
      await api.patch(`/api/admin/teams/${teamId}/members/${memberId}`);
      onChange();
    } catch (e) {
      alert(errorMessage(e));
    } finally {
      setLoadingAction(false);
    }
  }

  return (
    <div className="space-y-4">
      {error && (
        <div
          className="p-3 rounded-xl text-sm font-semibold"
          style={{ background: "#fee2e2", color: "#991b1b" }}
        >
          ⚠️ {error}
        </div>
      )}

      {format !== "KNOCKOUT" && (
        <GroupsPanel
          activityId={activityId}
          groups={groups}
          teams={teams}
          onChange={onChange}
          onError={setError}
        />
      )}

      {groups.length > 0 && teams.some((t) => !t.groupId) && (
        <div className="card p-4">
          <p className="text-sm font-bold mb-2" style={{ color: "var(--text-main)" }}>
            🏳️ فرق بدون مجموعة ({teams.filter((t) => !t.groupId).length})
          </p>
          <div className="space-y-1.5">
            {teams
              .filter((t) => !t.groupId)
              .map((t) => (
                <div key={t.id} className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold" style={{ color: "var(--text-main)" }}>
                    {t.name}
                  </span>
                  <select
                    value=""
                    onChange={(e) => setTeamGroup(t.id, e.target.value)}
                    className="input text-xs"
                    style={{ width: "auto" }}
                  >
                    <option value="">اختر مجموعة...</option>
                    {groups.map((g) => (
                      <option key={g.id} value={g.id}>
                        {g.name}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
          </div>
        </div>
      )}

      <p className="text-sm font-bold" style={{ color: "var(--text-main)" }}>
        عدد الفرق: {teams.length}
      </p>

      {teams.map((team) => (
        <div key={team.id} className="card p-4">
          <div className="flex items-center justify-between gap-2 mb-2">
            {editingTeamId === team.id ? (
              <div className="flex items-center gap-1.5 flex-1">
                <input
                  type="text"
                  value={editTeamName}
                  onChange={(e) => setEditTeamName(e.target.value)}
                  maxLength={40}
                  className="input text-sm flex-1"
                  autoFocus
                />
                <button
                  onClick={() => renameTeam(team.id)}
                  disabled={loadingAction}
                  className="text-xs px-2 py-1 rounded-lg font-bold"
                  style={{ background: "var(--mint-600)", color: "white" }}
                >
                  حفظ
                </button>
                <button
                  onClick={() => setEditingTeamId(null)}
                  className="text-xs px-2 py-1 rounded-lg font-bold"
                  style={{
                    background: "white",
                    color: "var(--text-muted)",
                    border: "1px solid var(--mint-200)",
                  }}
                >
                  إلغاء
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  setEditingTeamId(team.id);
                  setEditTeamName(team.name);
                }}
                className="font-bold flex items-center gap-1.5"
                style={{ color: "var(--text-main)" }}
              >
                <TeamLogo logo={team.logo} name={shownName(team)} size={22} />
                {shownName(team)} <Icon name="pencil" size={12} className="icon-inline" />
              </button>
            )}
            {teamSize !== null && team.members.length !== teamSize && (
              <span className="badge shrink-0" style={{ background: "#fef3c7", color: "#92400e" }}>
                {team.members.length} / {teamSize}
              </span>
            )}
            <button
              onClick={() => deleteTeam(team.id)}
              disabled={loadingAction}
              className="text-xs px-2.5 py-1.5 rounded-lg font-bold shrink-0"
              style={{ background: "#fee2e2", color: "#991b1b" }}
            >
              🗑 حذف الفريق
            </button>
          </div>

          <PhotoUpload
            photo={team.logo}
            imageUrlPrefix="/api/files/team"
            variant="avatar"
            label="شعار الفريق"
            placeholderIcon="🛡️"
            onUpload={(filename) => setTeamLogo(team.id, filename)}
          />

          {groups.length > 0 && (
            <select
              value={team.groupId || ""}
              onChange={(e) => setTeamGroup(team.id, e.target.value)}
              className="input text-sm mb-2"
            >
              <option value="">بدون مجموعة</option>
              {groups.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.name}
                </option>
              ))}
            </select>
          )}

          <div className="space-y-1.5 mb-2">
            {team.members.length === 0 ? (
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                لا يوجد لاعبون بعد
              </p>
            ) : (
              team.members.map(({ member, status }) => (
                <div key={member.id} className="flex items-center justify-between text-sm gap-2">
                  {editingMemberId === member.id ? (
                    <div className="flex items-center gap-1.5 flex-1">
                      <input
                        type="text"
                        value={editMemberName}
                        onChange={(e) => setEditMemberName(e.target.value)}
                        maxLength={30}
                        className="input text-sm flex-1"
                        autoFocus
                      />
                      <button
                        onClick={() => renameMember(member.id)}
                        disabled={loadingAction}
                        className="text-xs px-2 py-1 rounded-lg font-bold"
                        style={{ background: "var(--mint-600)", color: "white" }}
                      >
                        حفظ
                      </button>
                      <button
                        onClick={() => setEditingMemberId(null)}
                        className="text-xs px-2 py-1 rounded-lg font-bold"
                        style={{
                          background: "white",
                          color: "var(--text-muted)",
                          border: "1px solid var(--mint-200)",
                        }}
                      >
                        إلغاء
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => {
                        setEditingMemberId(member.id);
                        setEditMemberName(member.fullName);
                      }}
                      className="flex-1 flex items-center gap-2 text-right"
                      style={{ color: "var(--text-main)" }}
                    >
                      <PlayerAvatar photo={member.photo} fullName={member.fullName} size={22} />
                      {member.fullName} <Icon name="pencil" size={12} className="icon-inline" />
                      {status === "PENDING" && (
                        <span className="badge badge-pending" style={{ fontSize: "10px" }}>
                          ⏳ بانتظار الموافقة
                        </span>
                      )}
                    </button>
                  )}
                  <div className="flex items-center gap-1.5 shrink-0">
                    {status === "PENDING" && (
                      <button
                        onClick={() => approveMember(team.id, member.id)}
                        disabled={loadingAction}
                        className="text-xs px-2 py-1 rounded-lg font-bold"
                        style={{ background: "var(--mint-600)", color: "white" }}
                      >
                        ✓ قبول
                      </button>
                    )}
                    <button
                      onClick={() => removeMember(team.id, member.id)}
                      className="text-xs px-2 py-1 rounded-lg font-bold"
                      style={{
                        background: status === "PENDING" ? "#fee2e2" : "var(--mint-100)",
                        color: status === "PENDING" ? "#991b1b" : "var(--mint-700)",
                      }}
                    >
                      {status === "PENDING" ? <IconLabel name="close">رفض</IconLabel> : "إزالة"}
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {addingTo === team.id ? (
            <div className="flex gap-2">
              <select
                value={selectedMember[team.id] || ""}
                onChange={(e) => setSelectedMember((p) => ({ ...p, [team.id]: e.target.value }))}
                className="input flex-1"
              >
                <option value="">اختر لاعباً...</option>
                {unassigned.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.fullName}
                  </option>
                ))}
              </select>
              <button
                onClick={() => addMember(team.id)}
                disabled={!selectedMember[team.id] || loadingAction}
                className="btn btn-primary text-xs px-3"
                style={{ width: "auto" }}
              >
                إضافة
              </button>
            </div>
          ) : (
            <button
              onClick={() => setAddingTo(team.id)}
              className="text-xs px-3 py-1.5 rounded-lg font-bold"
              style={{ background: "var(--mint-100)", color: "var(--mint-700)" }}
            >
              <IconLabel name="plus">إضافة لاعب</IconLabel>
            </button>
          )}
        </div>
      ))}

      <form onSubmit={createTeam} className="card p-4 space-y-2">
        <PhotoUpload
          photo={newTeamLogo || null}
          imageUrlPrefix="/api/files/team"
          variant="avatar"
          label="شعار الفريق"
          placeholderIcon="🛡️"
          onUpload={(filename) => setNewTeamLogo(filename)}
        />
        <input
          type="text"
          placeholder="اسم الفريق الجديد"
          value={newTeamName}
          onChange={(e) => setNewTeamName(e.target.value)}
          maxLength={40}
          required
          className="input"
        />
        {groups.length > 0 && (
          <select
            value={newTeamGroup}
            onChange={(e) => setNewTeamGroup(e.target.value)}
            className="input"
          >
            <option value="">بدون مجموعة</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        )}
        <button type="submit" disabled={loadingAction} className="btn btn-primary text-sm">
          {loadingAction ? "..." : <IconLabel name="plus">فريق</IconLabel>}
        </button>
      </form>

      {unassigned.length > 0 && (
        <div className="card p-4">
          <p className="text-sm font-bold mb-2" style={{ color: "var(--text-main)" }}>
            🧍 لاعبون غير مصنّفين ({unassigned.length})
          </p>
          <div className="flex flex-wrap gap-1.5">
            {unassigned.map((m) =>
              editingMemberId === m.id ? (
                <div key={m.id} className="flex items-center gap-1.5">
                  <input
                    type="text"
                    value={editMemberName}
                    onChange={(e) => setEditMemberName(e.target.value)}
                    maxLength={30}
                    className="input text-xs"
                    style={{ width: "120px" }}
                    autoFocus
                  />
                  <button
                    onClick={() => renameMember(m.id)}
                    disabled={loadingAction}
                    className="text-xs px-2 py-1 rounded-lg font-bold"
                    style={{ background: "var(--mint-600)", color: "white" }}
                  >
                    حفظ
                  </button>
                  <button
                    onClick={() => setEditingMemberId(null)}
                    className="text-xs px-2 py-1 rounded-lg font-bold"
                    style={{
                      background: "white",
                      color: "var(--text-muted)",
                      border: "1px solid var(--mint-200)",
                    }}
                  >
                    إلغاء
                  </button>
                </div>
              ) : (
                <button
                  key={m.id}
                  onClick={() => {
                    setEditingMemberId(m.id);
                    setEditMemberName(m.fullName);
                  }}
                  className="badge badge-pending flex items-center gap-1.5"
                >
                  <PlayerAvatar photo={m.photo} fullName={m.fullName} size={16} />
                  {m.fullName} <Icon name="pencil" size={12} className="icon-inline" />
                </button>
              ),
            )}
          </div>
        </div>
      )}
    </div>
  );
}
