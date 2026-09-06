"use client";

import { useState } from "react";
import { api, errorMessage } from "@/lib/api";
import { useToast } from "@/components/Toast";
import IconLabel from "@/components/IconLabel";
import DialogHeader from "@/components/DialogHeader";
import type { ActivityDetail } from "@/components/admin/activityDetailTypes";
import { convertCampaign as texts } from "@/lib/texts";

export default function ConvertCampaignCard({
  activity,
  onChanged,
}: {
  activity: ActivityDetail["activity"];
  onChanged: () => Promise<void> | void;
}) {
  const showToast = useToast();
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);
  const [link, setLink] = useState(activity.whatsappLink ?? "");
  const pending = activity.registrations.filter((r) => r.status === "PENDING").length;

  async function convert(settlePending?: "accept" | "reject") {
    setBusy(true);
    try {
      await api.patch(`/api/admin/activities/${activity.id}`, {
        isVolunteer: true,
        whatsappLink: link.trim(),
        ...(settlePending ? { settlePending } : {}),
      });
      setOpen(false);
      await onChanged();
      showToast(texts.converted);
    } catch (e) {
      showToast(errorMessage(e), "error");
    } finally {
      setBusy(false);
    }
  }

  async function unconvert() {
    setBusy(true);
    try {
      await api.patch(`/api/admin/activities/${activity.id}`, { isVolunteer: false });
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
          <IconLabel name="handshake">{texts.heading}</IconLabel>
        </p>
        {!activity.isVolunteer && (
          <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
            {texts.hint}
          </p>
        )}
      </div>
      <div className="flex gap-2 shrink-0">
        {activity.isVolunteer ? (
          <button onClick={unconvert} disabled={busy} className="btn btn-sm btn-ghost">
            {busy ? "..." : texts.unconvert}
          </button>
        ) : (
          <button onClick={() => setOpen(true)} disabled={busy} className="btn btn-sm btn-ghost">
            {texts.convert}
          </button>
        )}
      </div>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end md:items-center justify-center"
          style={{ background: "rgba(10,30,20,0.6)", backdropFilter: "blur(4px)" }}
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div
            className="w-full max-w-md rounded-t-3xl md:rounded-2xl overflow-y-auto"
            style={{ background: "var(--mint-50)", maxHeight: "92svh", direction: "rtl" }}
          >
            <DialogHeader title={texts.dialogTitle} onClose={() => setOpen(false)} />
            <div className="p-4 space-y-4">
              <div>
                <label htmlFor="campaign-whatsapp" className="block text-sm font-bold mb-1.5">
                  {texts.whatsappLabel}
                </label>
                <input
                  id="campaign-whatsapp"
                  value={link}
                  onChange={(e) => setLink(e.target.value)}
                  dir="ltr"
                  className="input"
                />
              </div>

              {pending > 0 ? (
                <div className="space-y-2">
                  <p className="text-sm font-bold" style={{ color: "var(--text-main)" }}>
                    {texts.pendingHeading(pending)}
                  </p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {texts.pendingHint}
                  </p>
                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={() => convert("accept")}
                      disabled={busy}
                      className="btn btn-primary text-sm"
                    >
                      {busy ? "..." : texts.acceptAll}
                    </button>
                    <button
                      onClick={() => convert("reject")}
                      disabled={busy}
                      className="btn btn-sm btn-ghost"
                    >
                      {busy ? "..." : texts.rejectAll}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => convert()}
                  disabled={busy}
                  className="btn btn-primary text-sm"
                >
                  {busy ? "..." : texts.confirm}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
