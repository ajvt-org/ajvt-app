"use client";

import { useState } from "react";
import { api, errorMessage } from "@/lib/api";
import { useToast } from "@/components/Toast";
import IconLabel from "@/components/IconLabel";
import DialogHeader from "@/components/DialogHeader";
import TournamentSetupFields from "../TournamentSetupFields";
import type { ActivityDetail } from "@/components/admin/activityDetailTypes";

export default function ConvertTournamentCard({
  activity,
  onChanged,
}: {
  activity: ActivityDetail["activity"];
  onChanged: () => Promise<void> | void;
}) {
  const showToast = useToast();
  const [busy, setBusy] = useState(false);
  const [setup, setSetup] = useState<{ format: string; teamSize: string } | null>(null);

  async function convert() {
    if (!setup) return;
    setBusy(true);
    try {
      await api.patch(`/api/admin/activities/${activity.id}`, {
        isTournament: true,
        format: setup.format,
        teamSize: setup.teamSize,
      });
      setSetup(null);
      await onChanged();
      showToast("أصبح النشاط بطولة");
    } catch (e) {
      showToast(errorMessage(e), "error");
    } finally {
      setBusy(false);
    }
  }

  async function unconvert() {
    setBusy(true);
    try {
      await api.patch(`/api/admin/activities/${activity.id}`, { isTournament: false });
      await onChanged();
      showToast("لم يعد النشاط بطولة");
    } catch (e) {
      showToast(errorMessage(e), "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card p-4 flex items-center justify-between gap-3 flex-wrap">
      <div className="min-w-0">
        <p className="text-sm font-bold" style={{ color: "var(--text-main)" }}>
          <IconLabel name="trophy">وضع البطولة</IconLabel>
        </p>
        <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
          {activity.isTournament
            ? "هذا النشاط بطولة، له فرق ومباريات وترتيب."
            : "حوّل النشاط إلى بطولة ليحصل على فرق ومباريات وترتيب."}
        </p>
      </div>
      <button
        onClick={() =>
          activity.isTournament ? unconvert() : setSetup({ format: "KNOCKOUT", teamSize: "" })
        }
        disabled={busy}
        className="btn btn-sm btn-ghost shrink-0"
      >
        {busy ? "..." : activity.isTournament ? "إلغاء وضع البطولة" : "تحويل إلى بطولة"}
      </button>

      {setup && (
        <div
          className="fixed inset-0 z-50 flex items-end md:items-center justify-center"
          style={{ background: "rgba(10,30,20,0.6)", backdropFilter: "blur(4px)" }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setSetup(null);
          }}
        >
          <div
            className="w-full max-w-md rounded-t-3xl md:rounded-2xl overflow-y-auto"
            style={{ background: "var(--mint-50)", maxHeight: "92svh", direction: "rtl" }}
          >
            <DialogHeader title="تحويل إلى بطولة" onClose={() => setSetup(null)} />
            <div className="p-4 space-y-4">
              <TournamentSetupFields
                format={setup.format}
                teamSize={setup.teamSize}
                onFormat={(format) => setSetup((p) => p && { ...p, format })}
                onTeamSize={(teamSize) => setSetup((p) => p && { ...p, teamSize })}
              />
              <button onClick={convert} disabled={busy} className="btn btn-primary text-sm">
                {busy ? "..." : "تحويل إلى بطولة"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
