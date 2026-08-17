"use client";

import { useState } from "react";
import { api, errorMessage } from "@/lib/api";
import FinanceTagChips, { type FinanceTag } from "@/components/admin/FinanceTagChips";

export default function DonationTags({
  donationId,
  tags,
  allTags,
  onSaved,
}: {
  donationId: string;
  tags: FinanceTag[];
  allTags: FinanceTag[];
  onSaved: (tags: FinanceTag[]) => void;
}) {
  const [editing, setEditing] = useState(false);
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
      setEditing(false);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  if (!editing) {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        <FinanceTagChips tags={tags} empty="بدون تصنيف" />
        <button
          onClick={() => {
            setPicked(tags.map((t) => t.id));
            setEditing(true);
          }}
          className="text-xs font-bold"
          style={{ color: "var(--mint-700)" }}
        >
          تصنيف
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <FinanceTagChips
        tags={allTags}
        selected={picked}
        onToggle={toggle}
        empty="لا توجد تصنيفات بعد"
      />
      <div className="flex gap-2">
        <button
          onClick={save}
          disabled={saving}
          className="text-xs px-3 py-1.5 rounded-lg font-bold"
          style={{ background: "var(--mint-600)", color: "white" }}
        >
          {saving ? "..." : "حفظ"}
        </button>
        <button
          onClick={() => setEditing(false)}
          className="text-xs px-3 py-1.5 rounded-lg font-bold"
          style={{ background: "var(--mint-100)", color: "var(--mint-700)" }}
        >
          إلغاء
        </button>
      </div>
      {error && (
        <p className="text-xs" style={{ color: "#dc2626" }}>
          {error}
        </p>
      )}
    </div>
  );
}
