"use client";

import { useState } from "react";
import Icon from "@/components/Icon";
import type { Group, Team } from "./types";
import { api, errorMessage } from "@/lib/api";
import IconLabel from "@/components/IconLabel";

export default function GroupsPanel({
  activityId,
  groups,
  teams,
  onChange,
  onError,
}: {
  activityId: string;
  groups: Group[];
  teams: Team[];
  onChange: () => void;
  onError: (message: string) => void;
}) {
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupCapacity, setNewGroupCapacity] = useState("");
  const [editingCapacityId, setEditingCapacityId] = useState<string | null>(null);
  const [editCapacity, setEditCapacity] = useState("");
  const [loadingAction, setLoadingAction] = useState(false);

  async function createGroup(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    onError("");
    setLoadingAction(true);
    try {
      await api.post(`/api/admin/activities/${activityId}/groups`, {
        name: newGroupName,
        capacity: newGroupCapacity || null,
      });
      setNewGroupName("");
      setNewGroupCapacity("");
      onChange();
    } catch (e) {
      onError(errorMessage(e));
    } finally {
      setLoadingAction(false);
    }
  }

  async function saveCapacity(group: Group) {
    setLoadingAction(true);
    try {
      await api.patch(`/api/admin/groups/${group.id}`, {
        name: group.name,
        capacity: editCapacity || null,
      });
      setEditingCapacityId(null);
      onChange();
    } catch (e) {
      alert(errorMessage(e));
    } finally {
      setLoadingAction(false);
    }
  }

  async function deleteGroup(groupId: string) {
    if (!confirm("حذف هذه المجموعة؟ ستبقى الفرق لكن بدون تصنيف.")) return;
    setLoadingAction(true);
    try {
      await api.del(`/api/admin/groups/${groupId}`);
      onChange();
    } catch (e) {
      alert(errorMessage(e));
    } finally {
      setLoadingAction(false);
    }
  }

  return (
    <div className="card p-4">
      <p className="text-sm font-bold mb-2" style={{ color: "var(--text-main)" }}>
        <IconLabel name="list">
          المجموعات (اختياري — للبطولات بنظام الدوري ثم خروج المغلوب)
        </IconLabel>
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
                      <Icon name="check" size={13} />
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
                  aria-label={`حذف ${g.name}`}
                  className="flex items-center justify-center shrink-0"
                  style={{ width: 32, height: 32, color: "#991b1b" }}
                >
                  <Icon name="close" size={16} />
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
  );
}
