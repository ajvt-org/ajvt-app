"use client";

import { useState } from "react";
import { api, errorMessage } from "@/lib/api";
import { pendingAgeGroups } from "@/lib/texts";
import IconLabel from "@/components/IconLabel";
import type { AgeGroup } from "./types";

export default function PendingAgeGroups({
  groups,
  onChanged,
}: {
  groups: AgeGroup[];
  onChanged: () => void;
}) {
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");

  if (groups.length === 0) return null;

  async function run(id: string, action: () => Promise<unknown>) {
    setBusyId(id);
    setError("");
    try {
      await action();
      onChanged();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div
      className="rounded-xl p-3 space-y-2"
      style={{ background: "#fef3c7", border: "1px solid #fcd34d" }}
    >
      <p className="text-xs font-bold" style={{ color: "#92400e" }}>
        <IconLabel name="clock">{pendingAgeGroups.title}</IconLabel>
      </p>
      <p className="text-[11px]" style={{ color: "#92400e" }}>
        {pendingAgeGroups.intro}
      </p>

      {error && (
        <p className="text-xs font-semibold" style={{ color: "#991b1b" }}>
          {error}
        </p>
      )}

      {groups.map((group) => (
        <div key={group.id} className="flex items-center gap-2">
          <span className="text-sm font-bold flex-1 truncate" style={{ color: "var(--text-main)" }}>
            {group.name}
            {group.count ? (
              <span className="text-xs font-normal mr-1.5" style={{ color: "var(--text-muted)" }}>
                ({group.count})
              </span>
            ) : null}
          </span>
          <button
            onClick={() =>
              run(group.id, () =>
                api.patch(`/api/admin/age-groups/${group.id}`, { approved: true }),
              )
            }
            disabled={busyId === group.id}
            className="text-xs px-2.5 py-1.5 rounded-lg font-bold shrink-0"
            style={{ background: "var(--mint-600)", color: "white" }}
          >
            {busyId === group.id ? (
              "..."
            ) : (
              <IconLabel name="check">{pendingAgeGroups.approve}</IconLabel>
            )}
          </button>
          <button
            onClick={() => {
              if (!confirm(pendingAgeGroups.confirmReject)) return;
              run(group.id, () => api.del(`/api/admin/age-groups/${group.id}`));
            }}
            disabled={busyId === group.id}
            className="text-xs px-2.5 py-1.5 rounded-lg font-bold shrink-0"
            style={{ background: "#fee2e2", color: "#991b1b" }}
          >
            {pendingAgeGroups.reject}
          </button>
        </div>
      ))}
    </div>
  );
}
