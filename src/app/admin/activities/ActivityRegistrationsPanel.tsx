"use client";

import IconLabel from "@/components/IconLabel";
import PendingRegistrationCard from "./PendingRegistrationCard";
import AddMemberToActivityForm from "./AddMemberToActivityForm";
import { activityRegistrants as texts } from "@/lib/texts";
import type { Registration, MemberOption } from "./activityTypes";

export default function ActivityRegistrationsPanel({
  activityId,
  registrations,
  members,
  actionLoading,
  onReview,
  onRegister,
  onUnregister,
}: {
  activityId: string;
  registrations: Registration[];
  members: MemberOption[];
  actionLoading: boolean;
  onReview: (
    activityId: string,
    registrationId: string,
    status: "ACTIVE" | "REJECTED",
    reason?: string,
  ) => Promise<boolean>;
  onRegister: (activityId: string, memberId: string) => Promise<boolean>;
  onUnregister: (activityId: string, memberId: string) => void;
}) {
  const pending = registrations.filter((r) => r.status === "PENDING");
  const active = registrations.filter((r) => r.status === "ACTIVE");
  const registeredIds = new Set(
    registrations.filter((r) => r.status !== "REJECTED").map((r) => r.member.id),
  );
  const candidates = members.filter((m) => !registeredIds.has(m.id));

  return (
    <div className="mt-3 pt-3 space-y-3" style={{ borderTop: "1px solid var(--mint-100)" }}>
      <AddMemberToActivityForm
        activityId={activityId}
        candidates={candidates}
        actionLoading={actionLoading}
        onRegister={onRegister}
      />

      {pending.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-bold" style={{ color: "var(--text-main)" }}>
            <IconLabel name="clock">{texts.pending}</IconLabel>
          </p>
          {pending.map((r) => (
            <PendingRegistrationCard
              key={r.id}
              activityId={activityId}
              registration={r}
              actionLoading={actionLoading}
              onReview={onReview}
            />
          ))}
        </div>
      )}

      <div className="space-y-1.5">
        <p className="text-xs font-bold" style={{ color: "var(--text-main)" }}>
          <IconLabel name="check">{texts.confirmed}</IconLabel>
        </p>
        {active.length === 0 ? (
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            {texts.noneConfirmed}
          </p>
        ) : (
          active.map((r) => (
            <div key={r.id} className="flex items-center justify-between text-xs">
              <span style={{ color: "var(--text-main)" }}>{r.member.fullName}</span>
              <div className="flex items-center gap-2">
                <span style={{ color: "var(--text-muted)" }} dir="ltr">
                  {r.member.phone || texts.unknownPhone}
                </span>
                <button
                  onClick={() => onUnregister(activityId, r.member.id)}
                  className="font-bold px-2 py-0.5 rounded"
                  style={{ background: "#fee2e2", color: "#991b1b" }}
                >
                  {texts.remove}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
