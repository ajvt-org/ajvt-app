"use client";

import { useState } from "react";
import { api, errorMessage } from "@/lib/api";
import FinanceTagChips, { type FinanceTag } from "@/components/admin/FinanceTagChips";
import { donationActions, donationEdit } from "@/lib/texts";
import { DANGER_BOX, PRIMARY, QUIET } from "./donationTones";

export default function DonationTags({
  donationId,
  tags,
  allTags,
  onSaved,
  onClose,
}: {
  donationId: string;
  tags: FinanceTag[];
  allTags: FinanceTag[];
  onSaved: (tags: FinanceTag[]) => void;
  onClose: () => void;
}) {
  const [picked, setPicked] = useState<string[]>(tags.map((t) => t.id));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  function toggle(id: string) {
    setPicked((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]));
  }

  async function save() {
    setError("");
    setSaving(true);
    try {
      await api.patch(`/api/admin/donations/${donationId}`, { tagIds: picked });
      onSaved(allTags.filter((t) => picked.includes(t.id)));
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div
      className="p-2.5 rounded-lg space-y-2"
      style={{ background: "var(--mint-50)", border: "1px solid var(--mint-100)" }}
    >
      {error && (
        <div className="p-2 rounded-lg text-xs font-semibold" style={DANGER_BOX}>
          {error}
        </div>
      )}

      <FinanceTagChips
        tags={allTags}
        selected={picked}
        onToggle={toggle}
        empty={donationActions.noTags}
      />

      <div className="flex flex-wrap gap-2">
        <button onClick={save} disabled={saving} className="btn btn-sm font-bold" style={PRIMARY}>
          {saving ? "..." : donationEdit.save}
        </button>
        <button onClick={onClose} className="btn btn-sm font-bold" style={QUIET}>
          {donationEdit.cancel}
        </button>
      </div>
    </div>
  );
}
