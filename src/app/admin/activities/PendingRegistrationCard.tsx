"use client";

import { useState } from "react";
import ArrowLabel from "@/components/ArrowLabel";
import IconLabel from "@/components/IconLabel";
import RegistrantIdentity from "./RegistrantIdentity";
import RegistrationRecord from "./RegistrationRecord";
import { activityRegistrants as texts } from "@/lib/texts";
import type { Registration } from "./activityTypes";

export default function PendingRegistrationCard({
  activityId,
  registration,
  actionLoading,
  onReview,
}: {
  activityId: string;
  registration: Registration;
  actionLoading: boolean;
  onReview: (
    activityId: string,
    registrationId: string,
    status: "ACTIVE" | "REJECTED",
    reason?: string,
  ) => Promise<boolean>;
}) {
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const r = registration;

  return (
    <div className="rounded-xl p-2.5 space-y-1.5" style={{ background: "var(--mint-50)" }}>
      <RegistrantIdentity registration={r} />
      <RegistrationRecord registration={r} />
      {r.paymentProof && (
        <a
          href={`/api/files/${r.paymentProof}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs font-bold inline-block"
          style={{ color: "var(--mint-700)" }}
        >
          <ArrowLabel>
            <IconLabel name="receipt">{texts.viewProof}</IconLabel>
          </ArrowLabel>
        </a>
      )}
      {rejecting ? (
        <div className="space-y-1.5">
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={texts.rejectReason}
            maxLength={300}
            rows={2}
            className="input text-xs"
          />
          <div className="flex gap-1.5">
            <button
              onClick={async () => {
                const ok = await onReview(activityId, r.id, "REJECTED", reason);
                if (ok) {
                  setRejecting(false);
                  setReason("");
                }
              }}
              disabled={actionLoading}
              className="text-xs px-2.5 py-1 rounded-lg font-bold"
              style={{ background: "#991b1b", color: "white" }}
            >
              {texts.confirmReject}
            </button>
            <button
              onClick={() => {
                setRejecting(false);
                setReason("");
              }}
              className="text-xs px-2.5 py-1 rounded-lg font-bold"
              style={{
                background: "white",
                color: "var(--text-muted)",
                border: "1px solid var(--mint-200)",
              }}
            >
              {texts.cancel}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex gap-1.5">
          <button
            onClick={() => onReview(activityId, r.id, "ACTIVE")}
            disabled={actionLoading}
            className="text-xs px-2.5 py-1 rounded-lg font-bold"
            style={{ background: "var(--mint-600)", color: "white" }}
          >
            <IconLabel name="check">{texts.accept}</IconLabel>
          </button>
          <button
            onClick={() => setRejecting(true)}
            disabled={actionLoading}
            className="text-xs px-2.5 py-1 rounded-lg font-bold"
            style={{ background: "#fee2e2", color: "#991b1b" }}
          >
            <IconLabel name="close">{texts.reject}</IconLabel>
          </button>
        </div>
      )}
    </div>
  );
}
