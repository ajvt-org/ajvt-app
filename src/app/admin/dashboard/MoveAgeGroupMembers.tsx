"use client";

import { useState } from "react";
import { api, errorMessage } from "@/lib/api";
import type { AgeGroup } from "./types";

// Two groups that mean the same thing end up side by side when a name is
// added twice. Renaming one into the other is refused, the names collide,
// so the members move across instead and the emptied group is deleted by
// hand afterwards.
export default function MoveAgeGroupMembers({
  group,
  ageGroups,
  onDone,
  onCancel,
}: {
  group: AgeGroup;
  ageGroups: AgeGroup[];
  onDone: () => void;
  onCancel: () => void;
}) {
  const [target, setTarget] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const others = ageGroups.filter((g) => g.id !== group.id);

  async function move() {
    if (!target) return;
    if (!confirm(`نقل كل أعضاء "${group.name}" إلى "${target}"؟`)) return;
    setBusy(true);
    setError("");
    try {
      await api.post("/api/admin/age-groups/reassign", { from: group.name, to: target });
      onDone();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-2 pt-2 space-y-2" style={{ borderTop: "1px solid var(--mint-100)" }}>
      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
        نقل {group.count ?? 0} عضو إلى عصر آخر
      </p>
      {error && (
        <p className="text-xs font-semibold" style={{ color: "#991b1b" }}>
          {error}
        </p>
      )}
      <div className="flex items-center gap-2">
        <select
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          className="input text-sm"
          autoFocus
        >
          <option value="">اختر العصر...</option>
          {others.map((g) => (
            <option key={g.id} value={g.name}>
              {g.name}
            </option>
          ))}
        </select>
        <button
          onClick={move}
          disabled={busy || !target}
          className="text-xs px-3 py-2.5 rounded-lg font-bold shrink-0"
          style={{ background: "var(--mint-600)", color: "white" }}
        >
          {busy ? "..." : "نقل"}
        </button>
        <button
          onClick={onCancel}
          className="text-xs px-3 py-2.5 rounded-lg font-bold shrink-0"
          style={{ background: "var(--mint-100)", color: "var(--mint-700)" }}
        >
          إلغاء
        </button>
      </div>
    </div>
  );
}
