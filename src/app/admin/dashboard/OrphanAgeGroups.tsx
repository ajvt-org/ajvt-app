"use client";

import { useState } from "react";
import Notice from "@/components/Notice";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import { api, errorMessage } from "@/lib/api";
import type { AgeGroup, OrphanAge } from "./types";
import { counted } from "@/lib/arabicCount";
import { MEMBER } from "@/lib/messages";
import { moveAgeGroup, orphanAgeGroups as texts } from "@/lib/texts";

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
  const [asking, setAsking] = useState<string | null>(null);

  async function reassign(from: string) {
    const to = targets[from];
    setAsking(null);
    if (!to) return;
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
        {texts.title}
      </p>
      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
        {texts.intro}
      </p>

      {error && <Notice tone="error">{error}</Notice>}

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
              <option value="">{texts.pick}</option>
              {ageGroups.map((g) => (
                <option key={g.id} value={g.name}>
                  {g.name}
                </option>
              ))}
            </select>
            <button
              onClick={() => setAsking(orphan.name)}
              disabled={busy === orphan.name || !targets[orphan.name]}
              className="text-xs px-3 py-2.5 rounded-lg font-bold shrink-0"
              style={{ background: "var(--mint-600)", color: "white" }}
            >
              {busy === orphan.name ? "..." : texts.move}
            </button>
          </div>
        </div>
      ))}

      {asking && (
        <ConfirmDialog
          title={moveAgeGroup.confirmTitle}
          message={moveAgeGroup.confirmMove(asking, targets[asking] ?? "")}
          confirmLabel={moveAgeGroup.move}
          loading={busy !== null}
          onConfirm={() => reassign(asking)}
          onClose={() => setAsking(null)}
        />
      )}
    </div>
  );
}
