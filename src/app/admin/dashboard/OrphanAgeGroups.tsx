"use client";

import { useState } from "react";
import { api, errorMessage } from "@/lib/api";
import type { AgeGroup, OrphanAge } from "./types";
import { counted } from "@/lib/arabicCount";
import { MEMBER } from "@/lib/messages";

// An orphan is an age value members still carry that matches no group. They
// exist because renaming a group used to leave the members behind. Nothing
// else in the panel lists them, so without this they can only be fixed one
// member at a time.
export default function OrphanAgeGroups({
  orphans,
  ageGroups,
  onChanged,
}: {
  orphans: OrphanAge[];
  ageGroups: AgeGroup[];
  onChanged: () => void;
}) {
  const [targets, setTargets] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  async function reassign(from: string) {
    const to = targets[from];
    if (!to) return;
    if (!confirm(`نقل كل الأعضاء من "${from}" إلى "${to}"؟`)) return;
    setBusy(from);
    setError("");
    try {
      await api.post("/api/admin/age-groups/reassign", { from, to });
      onChanged();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(null);
    }
  }

  if (orphans.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="text-xs font-bold" style={{ color: "#991b1b" }}>
        أعصار لدى أعضاء ولا توجد في القائمة
      </p>
      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
        اختر العصر الصحيح لكل واحد منها لنقل أعضائه إليه.
      </p>

      {error && (
        <div
          className="p-2.5 rounded-lg text-xs font-semibold"
          style={{ background: "#fee2e2", color: "#991b1b" }}
        >
          {error}
        </div>
      )}

      {orphans.map((orphan) => (
        <div key={orphan.name} className="card p-3 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-bold truncate" style={{ color: "var(--text-main)" }}>
              {orphan.name}
            </span>
            <span className="text-xs shrink-0" style={{ color: "var(--text-muted)" }}>
              {counted(orphan.count, MEMBER)}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={targets[orphan.name] || ""}
              onChange={(e) => setTargets({ ...targets, [orphan.name]: e.target.value })}
              className="input text-sm"
            >
              <option value="">اختر العصر الصحيح...</option>
              {ageGroups.map((g) => (
                <option key={g.id} value={g.name}>
                  {g.name}
                </option>
              ))}
            </select>
            <button
              onClick={() => reassign(orphan.name)}
              disabled={busy === orphan.name || !targets[orphan.name]}
              className="text-xs px-3 py-2.5 rounded-lg font-bold shrink-0"
              style={{ background: "var(--mint-600)", color: "white" }}
            >
              {busy === orphan.name ? "..." : "نقل"}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
