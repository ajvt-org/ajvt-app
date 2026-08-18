"use client";

import IconLabel from "@/components/IconLabel";
import PendingRegistrationCard from "./PendingRegistrationCard";
import AddMemberToActivityForm from "./AddMemberToActivityForm";
import type { Activity, MemberOption } from "./activityTypes";

export default function ActivityRegistrationsPanel({
  activity,
  members,
  actionLoading,
  onReview,
  onRegister,
  onUnregister,
}: {
  activity: Activity;
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
  const pending = activity.registrations.filter((r) => r.status === "PENDING");
  const active = activity.registrations.filter((r) => r.status === "ACTIVE");
  const registeredIds = new Set(
    activity.registrations.filter((r) => r.status !== "REJECTED").map((r) => r.member.id),
  );
  const candidates = members.filter((m) => !registeredIds.has(m.id));

  return (
    <div className="mt-3 pt-3 space-y-3" style={{ borderTop: "1px solid var(--mint-100)" }}>
      {pending.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-bold" style={{ color: "var(--text-main)" }}>
            ⏳ طلبات قيد المراجعة
          </p>
          {pending.map((r) => (
            <PendingRegistrationCard
              key={r.id}
              activityId={activity.id}
              registration={r}
              actionLoading={actionLoading}
              onReview={onReview}
            />
          ))}
        </div>
      )}

      <div className="space-y-1.5">
        <p className="text-xs font-bold" style={{ color: "var(--text-main)" }}>
          <IconLabel name="check">مسجَّلون مؤكَّدون</IconLabel>
        </p>
        {active.length === 0 ? (
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            لا يوجد مسجلون مؤكَّدون بعد
          </p>
        ) : (
          active.map((r) => (
            <div key={r.id} className="flex items-center justify-between text-xs">
              <span style={{ color: "var(--text-main)" }}>{r.member.fullName}</span>
              <div className="flex items-center gap-2">
                <span style={{ color: "var(--text-muted)" }} dir="ltr">
                  {r.member.phone || "غير معروف"}
                </span>
                <button
                  onClick={() => onUnregister(activity.id, r.member.id)}
                  className="font-bold px-2 py-0.5 rounded"
                  style={{ background: "#fee2e2", color: "#991b1b" }}
                >
                  إزالة
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <AddMemberToActivityForm
        activityId={activity.id}
        candidates={candidates}
        actionLoading={actionLoading}
        onRegister={onRegister}
      />
    </div>
  );
}
