"use client";

import PhotoUpload from "@/components/PhotoUpload";
import PlayerAvatar from "@/components/tournament/PlayerAvatar";
import TeamLogo from "@/components/tournament/TeamLogo";
import { useState } from "react";
import type { Group, RosterMember, Team } from "./types";
import Icon from "@/components/Icon";

export default function TeamsTab({
  activityId,
  teams,
  groups,
  roster,
  onChange,
}: {
  activityId: string;
  teams: Team[];
  groups: Group[];
  roster: RosterMember[];
  onChange: () => void;
}) {
  const [newTeamName, setNewTeamName] = useState("");
  const [newTeamGroup, setNewTeamGroup] = useState("");
  const [newTeamLogo, setNewTeamLogo] = useState("");
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupCapacity, setNewGroupCapacity] = useState("");
  const [editingCapacityId, setEditingCapacityId] = useState<string | null>(null);
  const [editCapacity, setEditCapacity] = useState("");
  const [loadingAction, setLoadingAction] = useState(false);
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
      const res = await fetch(`/api/admin/teams/${teamId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editTeamName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشلت العملية");
      setEditingTeamId(null);
      onChange();
    } catch (e) {
      alert(e instanceof Error ? e.message : "خطأ");
    } finally {
      setLoadingAction(false);
    }
  }

  async function renameMember(memberId: string) {
    if (!editMemberName.trim()) return;
    setLoadingAction(true);
    try {
      const res = await fetch(`/api/admin/members/${memberId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName: editMemberName }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشلت العملية");
      setEditingMemberId(null);
      onChange();
    } catch (e) {
      alert(e instanceof Error ? e.message : "خطأ");
    } finally {
      setLoadingAction(false);
    }
  }

  async function createGroup(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoadingAction(true);
    try {
      const res = await fetch(`/api/admin/activities/${activityId}/groups`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newGroupName, capacity: newGroupCapacity || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشلت العملية");
      setNewGroupName("");
      setNewGroupCapacity("");
      onChange();
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطأ");
    } finally {
      setLoadingAction(false);
    }
  }

  async function saveCapacity(group: Group) {
    setLoadingAction(true);
    try {
      const res = await fetch(`/api/admin/groups/${group.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: group.name, capacity: editCapacity || null }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشلت العملية");
      setEditingCapacityId(null);
      onChange();
    } catch (e) {
      alert(e instanceof Error ? e.message : "خطأ");
    } finally {
      setLoadingAction(false);
    }
  }

  async function deleteGroup(groupId: string) {
    if (!confirm("حذف هذه المجموعة؟ ستبقى الفرق لكن بدون تصنيف.")) return;
    setLoadingAction(true);
    try {
      const res = await fetch(`/api/admin/groups/${groupId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("فشلت العملية");
      onChange();
    } catch (e) {
      alert(e instanceof Error ? e.message : "خطأ");
    } finally {
      setLoadingAction(false);
    }
  }

  async function setTeamGroup(teamId: string, groupId: string) {
    setLoadingAction(true);
    try {
      const res = await fetch(`/api/admin/teams/${teamId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groupId: groupId || null }),
      });
      if (!res.ok) throw new Error("فشلت العملية");
      onChange();
    } catch (e) {
      alert(e instanceof Error ? e.message : "خطأ");
    } finally {
      setLoadingAction(false);
    }
  }

  async function setTeamLogo(teamId: string, logo: string) {
    const res = await fetch(`/api/admin/teams/${teamId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ logo: logo || null }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "فشلت العملية");
    onChange();
  }

  async function createTeam(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoadingAction(true);
    try {
      const res = await fetch(`/api/admin/activities/${activityId}/teams`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newTeamName,
          groupId: newTeamGroup || null,
          logo: newTeamLogo || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشلت العملية");
      setNewTeamName("");
      setNewTeamGroup("");
      setNewTeamLogo("");
      onChange();
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطأ");
    } finally {
      setLoadingAction(false);
    }
  }

  async function deleteTeam(teamId: string) {
    if (!confirm("هل تريد حذف هذا الفريق؟")) return;
    setLoadingAction(true);
    try {
      const res = await fetch(`/api/admin/teams/${teamId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("فشلت العملية");
      onChange();
    } catch (e) {
      alert(e instanceof Error ? e.message : "خطأ");
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
      const res = await fetch(`/api/admin/teams/${teamId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشلت العملية");
      setSelectedMember((p) => ({ ...p, [teamId]: "" }));
      setAddingTo(null);
      onChange();
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطأ");
    } finally {
      setLoadingAction(false);
    }
  }

  async function removeMember(teamId: string, memberId: string) {
    setLoadingAction(true);
    try {
      const res = await fetch(`/api/admin/teams/${teamId}/members/${memberId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("فشلت العملية");
      onChange();
    } catch (e) {
      alert(e instanceof Error ? e.message : "خطأ");
    } finally {
      setLoadingAction(false);
    }
  }

  async function approveMember(teamId: string, memberId: string) {
    setLoadingAction(true);
    try {
      const res = await fetch(`/api/admin/teams/${teamId}/members/${memberId}`, {
        method: "PATCH",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشلت العملية");
      onChange();
    } catch (e) {
      alert(e instanceof Error ? e.message : "خطأ");
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

      <div className="card p-4">
        <p className="text-sm font-bold mb-2" style={{ color: "var(--text-main)" }}>
          🗂️ المجموعات (اختياري — للبطولات بنظام الدوري ثم خروج المغلوب)
        </p>
        {groups.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-2">
            {groups.map((g) => {
              const count = teams.filter((t) => t.groupId === g.id).length;
              const full = g.capacity != null && count >= g.capacity;
              return (
                <span
                  key={g.id}
                  className={
                    full
                      ? "badge flex items-center gap-1.5"
                      : "badge badge-pending flex items-center gap-1.5"
                  }
                  style={full ? { background: "#d1fae5", color: "#065f46" } : undefined}
                >
                  {g.name}
                  {g.capacity != null && (
                    <span className="font-semibold">
                      ({count}/{g.capacity})
                    </span>
                  )}
                  {editingCapacityId === g.id ? (
                    <span className="flex items-center gap-1">
                      <input
                        type="number"
                        min={2}
                        max={64}
                        value={editCapacity}
                        onChange={(e) => setEditCapacity(e.target.value)}
                        className="input text-xs"
                        style={{ width: "56px", padding: "2px 4px" }}
                        autoFocus
                      />
                      <button onClick={() => saveCapacity(g)} className="font-bold">
                        ✓
                      </button>
                    </span>
                  ) : (
                    <button
                      onClick={() => {
                        setEditingCapacityId(g.id);
                        setEditCapacity(g.capacity != null ? String(g.capacity) : "");
                      }}
                      className="text-xs"
                      title="تحديد عدد الفرق المستهدف"
                    >
                      <Icon name="target" size={14} />
                    </button>
                  )}
                  <button
                    onClick={() => deleteGroup(g.id)}
                    className="font-bold"
                    style={{ color: "#991b1b" }}
                  >
                    <Icon name="close" size={14} />
                  </button>
                </span>
              );
            })}
          </div>
        )}
        <form onSubmit={createGroup} className="flex gap-2">
          <input
            type="text"
            placeholder="اسم مجموعة جديدة (مثال: المجموعة أ)"
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
            maxLength={40}
            className="input flex-1 text-sm"
          />
          <input
            type="number"
            min={2}
            max={64}
            placeholder="عدد الفرق المستهدف"
            value={newGroupCapacity}
            onChange={(e) => setNewGroupCapacity(e.target.value)}
            className="input text-sm"
            style={{ width: "110px" }}
          />
          <button
            type="submit"
            disabled={!newGroupName.trim() || loadingAction}
            className="btn btn-primary text-xs px-3"
            style={{ width: "auto" }}
          >
            إضافة
          </button>
        </form>
      </div>

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
                <TeamLogo logo={team.logo} name={team.name} size={22} />
                {team.name} <span className="text-xs">✏️</span>
              </button>
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
                      {member.fullName} <span className="text-xs">✏️</span>
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
                      {status === "PENDING" ? "✕ رفض" : "إزالة"}
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
              ➕ إضافة لاعب
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
          {loadingAction ? "..." : "➕ فريق"}
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
                  {m.fullName} ✏️
                </button>
              ),
            )}
          </div>
        </div>
      )}
    </div>
  );
}
