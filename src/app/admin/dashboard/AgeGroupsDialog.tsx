"use client";

import { useState } from "react";
import { api, errorMessage } from "@/lib/api";
import type { AgeGroup } from "./types";

export default function AgeGroupsDialog({
  ageGroups,
  onChanged,
  onClose,
}: {
  ageGroups: AgeGroup[];
  onChanged: () => void;
  onClose: () => void;
}) {
  const [newAgeGroupName, setNewAgeGroupName] = useState("");
  const [ageGroupSaving, setAgeGroupSaving] = useState(false);
  const [ageGroupError, setAgeGroupError] = useState("");
  const [ageGroupBusyId, setAgeGroupBusyId] = useState<string | null>(null);
  const [renamingAgeGroupId, setRenamingAgeGroupId] = useState<string | null>(null);
  const [renameAgeGroupValue, setRenameAgeGroupValue] = useState("");

  async function addAgeGroup(e: React.FormEvent) {
    e.preventDefault();
    setAgeGroupError("");
    if (!newAgeGroupName.trim()) return;
    setAgeGroupSaving(true);
    try {
      await api.post("/api/admin/age-groups", { name: newAgeGroupName.trim() });
      onChanged();
      setNewAgeGroupName("");
    } catch (e) {
      setAgeGroupError(errorMessage(e));
    } finally {
      setAgeGroupSaving(false);
    }
  }

  function startRenameAgeGroup(g: AgeGroup) {
    setRenamingAgeGroupId(g.id);
    setRenameAgeGroupValue(g.name);
    setAgeGroupError("");
  }

  async function saveRenameAgeGroup(id: string) {
    if (!renameAgeGroupValue.trim()) return;
    setAgeGroupBusyId(id);
    setAgeGroupError("");
    try {
      await api.patch(`/api/admin/age-groups/${id}`, { name: renameAgeGroupValue.trim() });
      onChanged();
      setRenamingAgeGroupId(null);
    } catch (e) {
      setAgeGroupError(errorMessage(e));
    } finally {
      setAgeGroupBusyId(null);
    }
  }

  async function deleteAgeGroup(id: string) {
    if (!confirm("هل أنت متأكد من حذف هذا العصر من القائمة؟ لن يؤثر ذلك على الأعضاء الحاليين."))
      return;
    setAgeGroupBusyId(id);
    setAgeGroupError("");
    try {
      const res = await fetch(`/api/admin/age-groups/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "فشلت العملية");
      }
      onChanged();
    } catch (e) {
      setAgeGroupError(errorMessage(e));
    } finally {
      setAgeGroupBusyId(null);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center"
      style={{ background: "rgba(10,30,20,0.6)", backdropFilter: "blur(4px)" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-md rounded-t-3xl md:rounded-2xl overflow-y-auto"
        style={{ background: "var(--mint-50)", maxHeight: "92svh", direction: "rtl" }}
      >
        <div
          className="px-5 py-4 flex items-center justify-between sticky top-0"
          style={{ background: "linear-gradient(135deg, var(--mint-700), var(--mint-600))" }}
        >
          <h2 className="font-black text-white text-base">🏷️ إدارة الأعصر</h2>
          <button
            onClick={() => onClose()}
            className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold"
            style={{ background: "rgba(255,255,255,0.15)" }}
          >
            ✕
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            هذه القائمة تظهر عند إضافة عضو أو تعديل عصره. تعديل أو حذف عصر هنا لا يغيّر عصر الأعضاء
            الحاليين الذين اختاروه من قبل.
          </p>

          <form onSubmit={addAgeGroup} className="flex items-center gap-2">
            <input
              type="text"
              value={newAgeGroupName}
              onChange={(e) => setNewAgeGroupName(e.target.value)}
              placeholder="اسم عصر جديد..."
              maxLength={30}
              className="input text-sm"
            />
            <button
              type="submit"
              disabled={ageGroupSaving || !newAgeGroupName.trim()}
              className="text-xs px-3 py-2.5 rounded-lg font-bold shrink-0"
              style={{ background: "var(--mint-600)", color: "white" }}
            >
              {ageGroupSaving ? "..." : "➕ إضافة"}
            </button>
          </form>

          {ageGroupError && (
            <div
              className="p-2.5 rounded-lg text-xs font-semibold"
              style={{ background: "#fee2e2", color: "#991b1b" }}
            >
              ⚠️ {ageGroupError}
            </div>
          )}

          {ageGroups.length === 0 ? (
            <p className="text-sm text-center py-6" style={{ color: "var(--text-muted)" }}>
              لا توجد أعصر مسجلة بعد
            </p>
          ) : (
            <div className="space-y-2">
              {ageGroups.map((g) => (
                <div key={g.id} className="card p-3 flex items-center gap-2">
                  {renamingAgeGroupId === g.id ? (
                    <>
                      <input
                        type="text"
                        value={renameAgeGroupValue}
                        onChange={(e) => setRenameAgeGroupValue(e.target.value)}
                        maxLength={30}
                        className="input text-sm flex-1"
                        autoFocus
                      />
                      <button
                        onClick={() => saveRenameAgeGroup(g.id)}
                        disabled={ageGroupBusyId === g.id}
                        className="text-xs px-2.5 py-1.5 rounded-lg font-bold shrink-0"
                        style={{ background: "var(--mint-600)", color: "white" }}
                      >
                        {ageGroupBusyId === g.id ? "..." : "حفظ"}
                      </button>
                      <button
                        onClick={() => setRenamingAgeGroupId(null)}
                        className="text-xs px-2.5 py-1.5 rounded-lg font-bold shrink-0"
                        style={{ background: "var(--mint-100)", color: "var(--mint-700)" }}
                      >
                        إلغاء
                      </button>
                    </>
                  ) : (
                    <>
                      <span
                        className="text-sm font-bold flex-1 truncate"
                        style={{ color: "var(--text-main)" }}
                      >
                        {g.name}
                      </span>
                      <button
                        onClick={() => startRenameAgeGroup(g)}
                        disabled={ageGroupBusyId === g.id}
                        className="text-xs px-2.5 py-1.5 rounded-lg font-bold shrink-0"
                        style={{ background: "var(--mint-100)", color: "var(--mint-700)" }}
                      >
                        ✏️ تعديل
                      </button>
                      <button
                        onClick={() => deleteAgeGroup(g.id)}
                        disabled={ageGroupBusyId === g.id}
                        className="text-xs px-2.5 py-1.5 rounded-lg font-bold shrink-0"
                        style={{ background: "#fee2e2", color: "#991b1b" }}
                      >
                        {ageGroupBusyId === g.id ? "..." : "🗑️"}
                      </button>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
