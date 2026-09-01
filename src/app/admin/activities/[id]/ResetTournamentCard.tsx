"use client";

import { useState } from "react";
import { api, errorMessage } from "@/lib/api";
import { useToast } from "@/components/Toast";
import IconLabel from "@/components/IconLabel";
import ConfirmDialog from "@/components/admin/ConfirmDialog";
import { counted } from "@/lib/arabicCount";
import { DAY, GROUP, MATCH, RESULT, SUSPENSION } from "@/lib/messages";
import { resetTournament as texts } from "@/lib/texts";
import type { TournamentResetCounts } from "@/lib/tournamentResetServer";

export function deletionLines(counts: TournamentResetCounts): string[] {
  return [
    [counts.matches, MATCH] as const,
    [counts.results, RESULT] as const,
    [counts.groups, GROUP] as const,
    [counts.days, DAY] as const,
    [counts.suspensions, SUSPENSION] as const,
  ]
    .filter(([count]) => count > 0)
    .map(([count, noun]) => counted(count, noun));
}

export default function ResetTournamentCard({
  activityId,
  onReset,
}: {
  activityId: string;
  onReset: () => void;
}) {
  const showToast = useToast();
  const [counts, setCounts] = useState<TournamentResetCounts | null>(null);
  const [busy, setBusy] = useState(false);

  async function askFirst() {
    setBusy(true);
    try {
      setCounts(
        await api.get<TournamentResetCounts>(
          `/api/admin/activities/${activityId}/tournament-reset`,
        ),
      );
    } catch (e) {
      showToast(errorMessage(e) || texts.countsFailed, "error");
    } finally {
      setBusy(false);
    }
  }

  async function reset() {
    setBusy(true);
    try {
      await api.post(`/api/admin/activities/${activityId}/tournament-reset`);
      showToast(texts.done);
      setCounts(null);
      onReset();
    } catch (e) {
      showToast(errorMessage(e), "error");
    } finally {
      setBusy(false);
    }
  }

  const lines = counts ? deletionLines(counts) : [];

  return (
    <div className="card p-4 space-y-2" style={{ border: "1.5px solid #fecaca" }}>
      <p className="text-sm font-black" style={{ color: "#991b1b" }}>
        <IconLabel name="warning">{texts.heading}</IconLabel>
      </p>
      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
        {texts.hint}
      </p>
      <button
        onClick={askFirst}
        disabled={busy}
        className="btn text-sm font-bold"
        style={{ background: "white", color: "#991b1b", border: "1.5px solid #fca5a5" }}
      >
        {busy && !counts ? "..." : <IconLabel name="refresh">{texts.action}</IconLabel>}
      </button>
      {counts && (
        <ConfirmDialog
          title={texts.confirmTitle}
          message={
            <div className="space-y-3">
              {lines.length === 0 ? (
                <p>{texts.alreadyClear}</p>
              ) : (
                <div>
                  <p className="font-bold" style={{ color: "#991b1b" }}>
                    {texts.goesHeading}
                  </p>
                  <ul className="list-disc pe-5 mt-1 space-y-0.5">
                    {lines.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                </div>
              )}
              <div>
                <p className="font-bold" style={{ color: "var(--mint-700)" }}>
                  {texts.staysHeading}
                </p>
                <p className="mt-1">{texts.stays}</p>
              </div>
            </div>
          }
          confirmLabel={texts.confirmLabel}
          danger
          loading={busy}
          onConfirm={reset}
          onClose={() => setCounts(null)}
        />
      )}
    </div>
  );
}
