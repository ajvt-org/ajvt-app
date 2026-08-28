"use client";

import { useState } from "react";
import { api, errorMessage } from "@/lib/api";
import { villagesDialog } from "@/lib/texts";
import { OTHER_VILLAGE, VILLAGE_NAME_MAX } from "@/lib/villages";
import DialogHeader from "@/components/DialogHeader";
import IconLabel from "@/components/IconLabel";
import VillageRow from "./VillageRow";
import type { Village } from "./types";

export default function VillagesDialog({
  villages,
  otherCount,
  unlisted,
  onChanged,
  onShowOther,
  onClose,
}: {
  villages: Village[];
  otherCount: number;
  unlisted: { name: string; count: number }[];
  onChanged: () => void;
  onShowOther: () => void;
  onClose: () => void;
}) {
  const [newName, setNewName] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");

  async function addVillage(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setError("");
    if (!newName.trim()) return;
    setSaving(true);
    try {
      await api.post("/api/admin/villages", { name: newName.trim() });
      onChanged();
      setNewName("");
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function saveRename(id: string) {
    if (!renameValue.trim()) return;
    setBusyId(id);
    setError("");
    try {
      await api.patch(`/api/admin/villages/${id}`, { name: renameValue.trim() });
      onChanged();
      setRenamingId(null);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusyId(null);
    }
  }

  async function deleteVillage(id: string) {
    if (!confirm(villagesDialog.confirmDelete)) return;
    setBusyId(id);
    setError("");
    try {
      await api.del(`/api/admin/villages/${id}`);
      onChanged();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusyId(null);
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
          title={<IconLabel name="tag">{villagesDialog.title}</IconLabel>}
          onClose={onClose}
        />

        <div className="p-5 space-y-4">
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            {villagesDialog.intro}
          </p>

          {unlisted.length > 0 && (
            <div
              className="p-2.5 rounded-lg text-xs font-semibold"
              style={{ background: "#fef3c7", color: "#92400e" }}
            >
              <IconLabel name="warning">
                {villagesDialog.unlisted(
                  unlisted.map((row) => `${row.name} (${row.count})`).join("، "),
                )}
              </IconLabel>
            </div>
          )}

          <form onSubmit={addVillage} className="flex items-center gap-2">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder={villagesDialog.addPlaceholder}
              maxLength={VILLAGE_NAME_MAX}
              className="input text-sm"
            />
            <button
              type="submit"
              disabled={saving || !newName.trim()}
              className="text-xs px-3 py-2.5 rounded-lg font-bold shrink-0"
              style={{ background: "var(--mint-600)", color: "white" }}
            >
              {saving ? "..." : <IconLabel name="plus">{villagesDialog.add}</IconLabel>}
            </button>
          </form>

          {error && (
            <div
              className="p-2.5 rounded-lg text-xs font-semibold"
              style={{ background: "#fee2e2", color: "#991b1b" }}
            >
              <IconLabel name="warning">{error}</IconLabel>
            </div>
          )}

          {villages.length === 0 ? (
            <p className="text-sm text-center py-6" style={{ color: "var(--text-muted)" }}>
              {villagesDialog.empty}
            </p>
          ) : (
            <div className="space-y-2">
              {villages.map((village) => (
                <VillageRow
                  key={village.id}
                  village={village}
                  busy={busyId === village.id}
                  renaming={renamingId === village.id}
                  renameValue={renameValue}
                  onRenameValue={setRenameValue}
                  onStartRename={() => {
                    setRenamingId(village.id);
                    setRenameValue(village.name);
                    setError("");
                  }}
                  onCancelRename={() => setRenamingId(null)}
                  onSaveRename={() => saveRename(village.id)}
                  onDelete={() => deleteVillage(village.id)}
                />
              ))}
            </div>
          )}

          <div className="card p-3 flex items-center gap-2">
            <span
              className="text-sm font-bold flex-1 truncate"
              style={{ color: "var(--text-main)" }}
            >
              {OTHER_VILLAGE}
              {otherCount ? (
                <span className="text-xs font-normal mr-1.5" style={{ color: "var(--text-muted)" }}>
                  ({otherCount})
                </span>
              ) : null}
              <span
                className="block text-[11px] font-normal"
                style={{ color: "var(--text-muted)" }}
              >
                {villagesDialog.otherLocked}
              </span>
            </span>
            {otherCount > 0 && (
              <button
                onClick={onShowOther}
                className="text-xs px-2.5 py-1.5 rounded-lg font-bold shrink-0"
                style={{ background: "var(--mint-100)", color: "var(--mint-700)" }}
              >
                <IconLabel name="search">{villagesDialog.showOther}</IconLabel>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
