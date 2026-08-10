"use client";

import { useEffect, useState } from "react";
import PhotoUpload from "@/components/PhotoUpload";

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
  registrations: MemberRegistration[];
}

interface ActivitiesSectionProps {
  eligibleMembers: EligibleMember[];
  hasAnyMember: boolean;
  onReload: () => void;
}

const STATUS_LABEL: Record<string, string> = { PENDING: "⏳ قيد المراجعة", ACTIVE: "✓ مؤكَّد" };

export default function ActivitiesSection({ eligibleMembers, hasAnyMember, onReload }: ActivitiesSectionProps) {
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
          {hasAnyMember
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
  const [selected, setSelected] = useState<string[]>([]);
  const [proof, setProof] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  function regFor(member: EligibleMember) {
    return member.registrations.find((r) => r.activityId === activity.id) || null;
  }

  const registrable = eligibleMembers.filter((m) => {
    const r = regFor(m);
    return !r || r.status === "REJECTED";
  });
  const settled = eligibleMembers.filter((m) => {
    const r = regFor(m);
    return r && r.status !== "REJECTED";
  });

  function toggle(memberId: string) {
    setSelected((prev) => (prev.includes(memberId) ? prev.filter((x) => x !== memberId) : [...prev, memberId]));
  }

  async function submit() {
    if (selected.length === 0) { setError("اختر عضواً واحداً على الأقل"); return; }
    if (!proof) { setError("يرجى إرفاق صورة إثبات الدفع"); return; }
    setError("");
    setSubmitting(true);
    try {
      const res = await fetch("/api/activities/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activityId: activity.id, memberIds: selected, paymentProof: proof }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "فشلت العملية");
      setSelected([]);
      setProof(null);
      onReload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطأ غير متوقع");
    } finally {
      setSubmitting(false);
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

  const full = activity.capacity !== null && activity.registrantCount >= activity.capacity;
  const canRegister = registrable.length > 0 && activity.isOpen && !full;

  return (
    <div className="card overflow-hidden">
      {activity.photo && (
        activity.isTournament ? (
          <div className="pt-4 flex justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/files/activity/${activity.photo}`}
              alt={activity.title}
              className="w-20 h-20 rounded-full object-cover"
              style={{ border: "2px solid var(--mint-200)" }}
            />
          </div>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={`/api/files/activity/${activity.photo}`}
            alt={activity.title}
            className="w-full h-36 object-cover"
          />
        )
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

        {settled.length > 0 && (
          <div className="space-y-1.5 pt-2" style={{ borderTop: "1px solid var(--mint-100)" }}>
            {settled.map((m) => {
              const r = regFor(m)!;
              return (
                <div key={m.id} className="flex items-center justify-between gap-3 text-xs py-0.5">
                  <span style={{ color: "var(--text-main)" }}>{m.fullName}</span>
                  <div className="flex items-center gap-2">
                    <span className={`badge ${r.status === "ACTIVE" ? "badge-active" : "badge-pending"}`}>
                      {STATUS_LABEL[r.status]}
                    </span>
                    {r.status === "PENDING" && (
                      <button onClick={() => cancelPending(m.id)} className="font-bold" style={{ color: "#991b1b" }}>
                        إلغاء
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {registrable.length > 0 && !canRegister && (
          <p className="text-xs mt-2 pt-2" style={{ color: "var(--text-muted)", borderTop: "1px solid var(--mint-100)" }}>
            {!activity.isOpen ? "التسجيل في هذا النشاط مغلق حالياً" : "اكتمل عدد المسجلين في هذا النشاط"}
          </p>
        )}

        {canRegister && (
          <div className="mt-2 pt-3 space-y-2" style={{ borderTop: "1px solid var(--mint-100)" }}>
            <p className="text-xs font-bold" style={{ color: "var(--text-main)" }}>
              💳 التسجيل يتطلب دفعاً — يمكنك التسجيل لعدة أشخاص بصورة إثبات دفع واحدة
            </p>
            <div className="space-y-1">
              {registrable.map((m) => {
                const r = regFor(m);
                return (
                  <div key={m.id}>
                    <label className="flex items-center gap-2 text-xs">
                      <input type="checkbox" checked={selected.includes(m.id)} onChange={() => toggle(m.id)} />
                      <span style={{ color: "var(--text-main)" }}>{m.fullName}</span>
                    </label>
                    {r?.status === "REJECTED" && (
                      <p className="text-xs mr-6" style={{ color: "#991b1b" }}>
                        ❌ رُفض سابقاً{r.rejectionReason ? ` — ${r.rejectionReason}` : ""} — يمكنك إعادة المحاولة
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            {selected.length > 0 && (
              <>
                <PhotoUpload
                  photo={proof}
                  onUpload={(filename) => setProof(filename)}
                  variant="cover"
                  label="صورة إثبات الدفع"
                  placeholderIcon="🧾"
                />
                {error && (
                  <div className="p-2.5 rounded-xl text-xs font-semibold" style={{ background: "#fee2e2", color: "#991b1b" }}>
                    ⚠️ {error}
                  </div>
                )}
                <button
                  onClick={submit}
                  disabled={submitting}
                  className="btn btn-primary text-sm"
                >
                  {submitting ? "..." : `تسجيل ${selected.length} ${selected.length === 1 ? "عضو" : "أعضاء"} ←`}
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
