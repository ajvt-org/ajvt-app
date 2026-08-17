"use client";

import { useState } from "react";
import { api, errorMessage } from "@/lib/api";
import type { AgeGroup, OrphanAge } from "./types";
import OrphanAgeGroups from "./OrphanAgeGroups";
import MoveAgeGroupMembers from "./MoveAgeGroupMembers";
import AgeGroupTotal from "./AgeGroupTotal";
import DialogHeader from "@/components/DialogHeader";
import Icon from "@/components/Icon";
import IconLabel from "@/components/IconLabel";

export default function AgeGroupsDialog({
  ageGroups,
  orphans,
  onChanged,
  onClose,
}: {
  ageGroups: AgeGroup[];
  orphans: OrphanAge[];
  onChanged: () => void;
  onClose: () => void;
}) {
  const [newAgeGroupName, setNewAgeGroupName] = useState("");
  const [ageGroupSaving, setAgeGroupSaving] = useState(false);
  const [ageGroupError, setAgeGroupError] = useState("");
  const [ageGroupBusyId, setAgeGroupBusyId] = useState<string | null>(null);
  const [renamingAgeGroupId, setRenamingAgeGroupId] = useState<string | null>(null);
  const [renameAgeGroupValue, setRenameAgeGroupValue] = useState("");
  const [movingId, setMovingId] = useState<string | null>(null);

  async function addAgeGroup(e: React.SubmitEvent<HTMLFormElement>) {
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
      await api.del(`/api/admin/age-groups/${id}`);
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
        <DialogHeader
          title={<IconLabel name="tag">إدارة الأعصار</IconLabel>}
          onClose={() => onClose()}
        />

        <div className="p-5 space-y-4">
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            هذه القائمة تظهر عند إضافة عضو أو تعديل عصره. تعديل اسم عصر هنا يغيّره لدى كل الأعضاء
            الذين اختاروه من قبل، أما حذفه فلا يغيّر شيئاً لديهم.
          </p>

          <OrphanAgeGroups orphans={orphans} ageGroups={ageGroups} onChanged={onChanged} />

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
              {ageGroupSaving ? "..." : <IconLabel name="plus">إضافة</IconLabel>}
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
              لا توجد أعصار مسجلة بعد
            </p>
          ) : (
            <div className="space-y-2">
              {ageGroups.map((g) => (
                <div key={g.id} className="card p-3">
                  <div className="flex items-center gap-2">
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
                          {g.count ? (
                            <span
                              className="text-xs font-normal mr-1.5"
                              style={{ color: "var(--text-muted)" }}
                            >
                              ({g.count})
                            </span>
                          ) : null}
                        </span>
                        <button
                          onClick={() => setMovingId(movingId === g.id ? null : g.id)}
                          disabled={ageGroupBusyId === g.id || ageGroups.length < 2}
                          className="text-xs px-2.5 py-1.5 rounded-lg font-bold shrink-0"
                          style={{ background: "var(--mint-100)", color: "var(--mint-700)" }}
                        >
                          <IconLabel name="upload">نقل</IconLabel>
                        </button>
                        <button
                          onClick={() => startRenameAgeGroup(g)}
                          disabled={ageGroupBusyId === g.id}
                          className="text-xs px-2.5 py-1.5 rounded-lg font-bold shrink-0"
                          style={{ background: "var(--mint-100)", color: "var(--mint-700)" }}
                        >
                          <IconLabel name="pencil">تعديل</IconLabel>
                        </button>
                        <button
                          onClick={() => deleteAgeGroup(g.id)}
                          disabled={ageGroupBusyId === g.id}
                          className="text-xs px-2.5 py-1.5 rounded-lg font-bold shrink-0"
                          style={{ background: "#fee2e2", color: "#991b1b" }}
                        >
                          {ageGroupBusyId === g.id ? "..." : <Icon name="trash" size={14} />}
                        </button>
                      </>
                    )}
                  </div>
                  {renamingAgeGroupId !== g.id && <AgeGroupTotal group={g} onChanged={onChanged} />}
                  {movingId === g.id && (
                    <MoveAgeGroupMembers
                      group={g}
                      ageGroups={ageGroups}
                      onDone={() => {
                        setMovingId(null);
                        onChanged();
                      }}
                      onCancel={() => setMovingId(null)}
                    />
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
