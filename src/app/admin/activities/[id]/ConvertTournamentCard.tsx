"use client";

import { useState } from "react";
import { api, errorMessage } from "@/lib/api";
import { useToast } from "@/components/Toast";
import IconLabel from "@/components/IconLabel";
import DialogHeader from "@/components/DialogHeader";
import TournamentSetupFields, { TOURNAMENT_PRESETS, presetOf } from "../TournamentSetupFields";
import type { ActivityDetail } from "@/components/admin/activityDetailTypes";
import { convertTournament as texts, tournamentSetup } from "@/lib/texts";

export default function ConvertTournamentCard({
  activity,
  onChanged,
}: {
  activity: ActivityDetail["activity"];
  onChanged: () => Promise<void> | void;
}) {
  const showToast = useToast();
  const [busy, setBusy] = useState(false);
  const [setup, setSetup] = useState<{ format: string; profile: string; teamSize: string } | null>(
    null,
  );

  const teamSizeValue = activity.teamSize === null ? "" : String(activity.teamSize);
  const currentPreset = TOURNAMENT_PRESETS.find(
    (p) => p.value === presetOf(activity.profile, teamSizeValue),
  );

  function openDialog() {
    setSetup({
      format: activity.format ?? "KNOCKOUT",
      profile: activity.profile,
      teamSize: teamSizeValue,
    });
  }

  async function save() {
    if (!setup) return;
    setBusy(true);
    try {
      await api.patch(`/api/admin/activities/${activity.id}`, {
        isTournament: true,
        format: setup.format,
        profile: setup.profile,
        teamSize: setup.teamSize,
      });
      setSetup(null);
      await onChanged();
      showToast(activity.isTournament ? texts.settingsSaved : texts.converted);
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
      showToast(texts.unconverted);
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
          <IconLabel name="trophy">{texts.heading}</IconLabel>
        </p>
        <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
          {activity.isTournament
            ? `${currentPreset?.label ?? ""} · ${tournamentSetup.formats[activity.format ?? "KNOCKOUT"]}`
            : texts.hint}
        </p>
      </div>
      <div className="flex gap-2 shrink-0">
        {activity.isTournament ? (
          <>
            <button onClick={openDialog} disabled={busy} className="btn btn-sm btn-ghost">
              <IconLabel name="pencil">{texts.editSettings}</IconLabel>
            </button>
            <button onClick={unconvert} disabled={busy} className="btn btn-sm btn-ghost">
              {busy ? "..." : texts.unconvert}
            </button>
          </>
        ) : (
          <button onClick={openDialog} disabled={busy} className="btn btn-sm btn-ghost">
            {busy ? "..." : texts.convert}
          </button>
        )}
      </div>

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
            <DialogHeader
              title={activity.isTournament ? texts.settingsTitle : texts.dialogTitle}
              onClose={() => setSetup(null)}
            />
            <div className="p-4 space-y-4">
              <TournamentSetupFields
                format={setup.format}
                profile={setup.profile}
                teamSize={setup.teamSize}
                onFormat={(format) => setSetup((p) => p && { ...p, format })}
                onPreset={(preset) =>
                  setSetup((p) => p && { ...p, profile: preset.profile, teamSize: preset.teamSize })
                }
              />
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                {texts.lockHint}
              </p>
              <button onClick={save} disabled={busy} className="btn btn-primary text-sm">
                {busy ? "..." : activity.isTournament ? texts.saveSettings : texts.convert}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
