"use client";

import { useEffect, useState } from "react";
import PlayerAvatar from "@/components/tournament/PlayerAvatar";

interface Activity {
  id: string;
  title: string;
  description: string;
  period: string | null;
  photo: string | null;
  capacity: number | null;
  isOpen: boolean;
  isTournament: boolean;
  registrantCount: number;
}

interface MemberRegistration {
  activityId: string;
  status: "PENDING" | "ACTIVE" | "REJECTED";
  rejectionReason: string | null;
}

interface EligibleMember {
  id: string;
  fullName: string;
  photo: string | null;
  registrations: MemberRegistration[];
}

interface ActivitiesSectionProps {
  eligibleMembers: EligibleMember[];
  hasAnyMember: boolean;
  hasPendingMember: boolean;
  onReload: () => void;
}

const STATUS_LABEL: Record<string, string> = { PENDING: "⏳ قيد المراجعة", ACTIVE: "✅ مقبول", REJECTED: "❌ مرفوض" };
const STATUS_CLASS: Record<string, string> = { PENDING: "badge-pending", ACTIVE: "badge-active", REJECTED: "badge-rejected" };

export default function ActivitiesSection({ eligibleMembers, hasAnyMember, hasPendingMember, onReload }: ActivitiesSectionProps) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/activities")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (data?.activities) setActivities(data.activities); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading || activities.length === 0) return null;

  return (
    <div className="space-y-3 fade-up" id="activities">
      <h2 className="font-black text-lg" style={{ color: "var(--text-main)" }}>
        🏆 أنشطة هذا الصيف
      </h2>

      {eligibleMembers.length === 0 && (
        <p className="text-sm px-1" style={{ color: "var(--text-muted)" }}>
          {hasPendingMember
            ? "طلب انضمامك قيد المراجعة — بمجرد قبوله يمكنك التسجيل في الأنشطة."
            : hasAnyMember
            ? "طلب انضمامك مرفوض حالياً — تواصل مع المشرف للتسجيل في الأنشطة."
            : "تصفح الأنشطة المتاحة — سجّل طلب انضمام لتتمكن من التسجيل."}
        </p>
      )}

      <div className="space-y-3">
        {activities.map((activity) => (
          <ActivityCard key={activity.id} activity={activity} eligibleMembers={eligibleMembers} onReload={onReload} />
        ))}
      </div>
    </div>
  );
}

function ActivityCard({
  activity,
  eligibleMembers,
  onReload,
}: {
  activity: Activity;
  eligibleMembers: EligibleMember[];
  onReload: () => void;
}) {
  const [busyMemberId, setBusyMemberId] = useState<string | null>(null);
  const [error, setError] = useState("");

  function regFor(member: EligibleMember) {
    return member.registrations.find((r) => r.activityId === activity.id) || null;
  }

  const full = activity.capacity !== null && activity.registrantCount >= activity.capacity;

  async function register(memberId: string) {
    setError("");
    setBusyMemberId(memberId);
    try {
      const res = await fetch("/api/activities/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activityId: activity.id, memberId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشلت العملية");
      onReload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطأ غير متوقع");
    } finally {
      setBusyMemberId(null);
    }
  }

  async function cancelPending(memberId: string) {
    try {
      await fetch("/api/activities/register", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId, activityId: activity.id }),
      });
      onReload();
    } catch {
      // best-effort — the member can just try again
    }
  }

  return (
    <div className="card overflow-hidden">
      {activity.photo && (
        <div className="pt-4 flex justify-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/api/files/activity/${activity.photo}`}
            alt={activity.title}
            className="w-24 h-24 rounded-full object-cover"
            style={{ border: "2px solid var(--mint-200)" }}
          />
        </div>
      )}
      <div className="p-4">
        <div className="flex items-start justify-between gap-3 mb-1.5">
          <h3 className="font-bold" style={{ color: "var(--text-main)" }}>{activity.title}</h3>
          {activity.isOpen ? (
            <span className="badge badge-open-blink shrink-0 font-bold">🔴 التسجيل مفتوح</span>
          ) : (
            <span className="badge badge-rejected shrink-0">مغلق</span>
          )}
        </div>
        <p className="text-sm mb-2" style={{ color: "var(--text-muted)" }}>{activity.description}</p>
        <div className="flex items-center gap-3 text-xs mb-3" style={{ color: "var(--text-muted)" }}>
          {activity.period && <span>📅 {activity.period}</span>}
          {activity.capacity !== null && (
            <span>👥 {activity.registrantCount}/{activity.capacity}</span>
          )}
        </div>

        {activity.isTournament && (
          <a
            href={`/tournament/${activity.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs px-4 py-2.5 rounded-xl font-bold inline-block mb-3"
            style={{ background: "var(--mint-100)", color: "var(--mint-700)" }}
          >
            🏆 عرض الترتيب ←
          </a>
        )}

        {/* One tap per person — no payment, no form: membership already covers it */}
        <div className="space-y-1.5 pt-2" style={{ borderTop: "1px solid var(--mint-100)" }}>
          {eligibleMembers.map((m) => {
            const r = regFor(m);
            const settled = r && r.status !== "REJECTED";
            return (
              <div key={m.id}>
                <div className="flex items-center justify-between gap-3 text-xs py-0.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <PlayerAvatar photo={m.photo} fullName={m.fullName} size={26} bg="copper" />
                    <span className="truncate" style={{ color: "var(--text-main)" }}>{m.fullName}</span>
                  </div>
                  {settled ? (
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`badge ${STATUS_CLASS[r!.status]}`}>{STATUS_LABEL[r!.status]}</span>
                      {r!.status === "PENDING" && (
                        <button onClick={() => cancelPending(m.id)} className="font-bold" style={{ color: "#991b1b" }}>
                          إلغاء
                        </button>
                      )}
                    </div>
                  ) : activity.isOpen && !full ? (
                    <button
                      onClick={() => register(m.id)}
                      disabled={busyMemberId === m.id}
                      className="text-xs px-3 py-1.5 rounded-lg font-bold shrink-0"
                      style={{ background: "var(--mint-600)", color: "white" }}
                    >
                      {busyMemberId === m.id ? "..." : r?.status === "REJECTED" ? "🔄 إعادة المحاولة" : "📝 سجّل"}
                    </button>
                  ) : (
                    <span className="text-xs shrink-0" style={{ color: "var(--text-muted)" }}>
                      {!activity.isOpen ? "التسجيل مغلق" : "اكتمل العدد"}
                    </span>
                  )}
                </div>
                {r?.status === "REJECTED" && r.rejectionReason && (
                  <p className="text-xs mr-8" style={{ color: "#991b1b" }}>سبب الرفض السابق: {r.rejectionReason}</p>
                )}
              </div>
            );
          })}
        </div>

        {error && (
          <div className="p-2.5 rounded-xl text-xs font-semibold mt-2" style={{ background: "#fee2e2", color: "#991b1b" }}>
            ⚠️ {error}
          </div>
        )}
      </div>
    </div>
  );
}
