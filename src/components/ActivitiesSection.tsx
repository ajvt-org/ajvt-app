"use client";

import { useEffect, useState } from "react";

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

interface EligibleMember {
  id: string;
  fullName: string;
  registeredActivityIds: string[];
}

interface ActivitiesSectionProps {
  eligibleMembers: EligibleMember[];
  hasAnyMember: boolean;
  onRegistrationChange: (memberId: string, activityId: string, registered: boolean) => void;
}

export default function ActivitiesSection({ eligibleMembers, hasAnyMember, onRegistrationChange }: ActivitiesSectionProps) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<string | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/activities")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (data?.activities) setActivities(data.activities); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  async function toggle(memberId: string, activityId: string, registered: boolean) {
    const key = `${memberId}:${activityId}`;
    setPending(key);
    setError("");
    try {
      const res = await fetch("/api/activities/register", {
        method: registered ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId, activityId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشلت العملية");

      onRegistrationChange(memberId, activityId, !registered);
      setActivities((prev) =>
        prev.map((a) =>
          a.id === activityId
            ? { ...a, registrantCount: a.registrantCount + (registered ? -1 : 1) }
            : a
        )
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطأ غير متوقع");
    } finally {
      setPending(null);
    }
  }

  if (loading || activities.length === 0) return null;

  return (
    <div className="space-y-3 fade-up">
      <h2 className="font-black text-lg" style={{ color: "var(--text-main)" }}>
        🏆 أنشطة هذا الصيف
      </h2>

      {eligibleMembers.length === 0 && (
        <p className="text-sm px-1" style={{ color: "var(--text-muted)" }}>
          {hasAnyMember
            ? "طلب انضمامك مرفوض حالياً — تواصل مع المشرف للتسجيل في الأنشطة."
            : "تصفح الأنشطة المتاحة — سجّل طلب انضمام لتتمكن من التسجيل."}
        </p>
      )}

      {error && (
        <div className="p-3 rounded-xl text-sm font-semibold" style={{ background: "#fee2e2", color: "#991b1b" }}>
          ⚠️ {error}
        </div>
      )}

      <div className="space-y-3">
        {activities.map((activity) => (
          <div key={activity.id} className="card overflow-hidden">
            {activity.photo && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`/api/files/activity/${activity.photo}`}
                alt={activity.title}
                className="w-full h-36 object-cover"
              />
            )}
            <div className="p-4">
            <div className="flex items-start justify-between gap-3 mb-1.5">
              <h3 className="font-bold" style={{ color: "var(--text-main)" }}>{activity.title}</h3>
              {!activity.isOpen && <span className="badge badge-rejected shrink-0">مغلق</span>}
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
                className="text-xs font-bold inline-block mb-3"
                style={{ color: "var(--mint-700)" }}
              >
                🏆 الترتيب والنتائج ←
              </a>
            )}

            {eligibleMembers.map((member) => {
              const registered = member.registeredActivityIds.includes(activity.id);
              const key = `${member.id}:${activity.id}`;
              const full = activity.capacity !== null && activity.registrantCount >= activity.capacity && !registered;
              const disabled = pending === key || !activity.isOpen || full;
              return (
                <div
                  key={member.id}
                  className="flex items-center justify-between gap-3 py-1.5"
                  style={{ borderTop: "1px solid var(--mint-100)" }}
                >
                  {eligibleMembers.length > 1 && (
                    <span className="text-xs truncate" style={{ color: "var(--text-main)" }}>{member.fullName}</span>
                  )}
                  <button
                    onClick={() => toggle(member.id, activity.id, registered)}
                    disabled={disabled}
                    className="text-xs px-3 py-1.5 rounded-lg font-bold shrink-0 disabled:opacity-40"
                    style={{
                      background: registered ? "var(--mint-600)" : "var(--mint-100)",
                      color: registered ? "white" : "var(--mint-700)",
                    }}
                  >
                    {pending === key ? "..." : registered ? "✓ مسجّل — إلغاء" : full ? "اكتمل العدد" : "سجّل الآن"}
                  </button>
                </div>
              );
            })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
