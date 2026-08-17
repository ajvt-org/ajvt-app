"use client";

import { useState } from "react";
import { api, errorMessage } from "@/lib/api";
import type { AgeGroup } from "./types";

export default function AgeGroupTotal({
  group,
  onChanged,
}: {
  group: AgeGroup;
  onChanged: () => void;
}) {
  const [value, setValue] = useState(String(group.totalCount ?? 30));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const dirty = value !== String(group.totalCount ?? 30);

  async function save() {
    setError("");
    setSaving(true);
    try {
      await api.patch(`/api/admin/age-groups/${group.id}/total`, { totalCount: Number(value) });
      onChanged();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-2 pt-2" style={{ borderTop: "1px dashed var(--mint-200)" }}>
      <div className="flex items-center gap-2">
        <label
          htmlFor={`total-${group.id}`}
          className="text-xs shrink-0"
          style={{ color: "var(--text-muted)" }}
        >
          العدد الإجمالي
        </label>
        <input
          id={`total-${group.id}`}
          type="number"
          min={0}
          value={value}
          onChange={(e) => setValue(e.target.value.replace(/\D/g, ""))}
          className="input text-xs"
          style={{ width: "5.5rem" }}
        />
        <button
          onClick={save}
          disabled={saving || !dirty || value === ""}
          className="text-xs px-2.5 py-1.5 rounded-lg font-bold shrink-0 disabled:opacity-40"
          style={{ background: "var(--mint-600)", color: "white" }}
        >
          {saving ? "..." : "حفظ"}
        </button>
      </div>
      {error && (
        <p className="text-xs mt-1" style={{ color: "#dc2626" }}>
          {error}
        </p>
      )}
    </div>
  );
}
