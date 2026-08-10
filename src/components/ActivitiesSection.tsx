"use client";

import { useEffect, useState } from "react";
import PhotoUpload from "@/components/PhotoUpload";
import PaymentInfoBanner from "@/components/PaymentInfoBanner";

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
  const [expanded, setExpanded] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [proof, setProof] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  function regFor(member: EligibleMember) {
    return member.registrations.find((r) => r.activityId === activity.id) || null;
  }

  // Can (re)register: no registration yet, or a previous one was rejected.
  const registrable = eligibleMembers.filter((m) => {
    const r = regFor(m);
    return !r || r.status === "REJECTED";
  });

  function toggle(memberId: string) {
    setSelected((prev) => (prev.includes(memberId) ? prev.filter((x) => x !== memberId) : [...prev, memberId]));
  }

  function openForm() {
    setError("");
    setSelected(registrable.length === 1 ? [registrable[0].id] : []);
    setExpanded(true);
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
      setExpanded(false);
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
  const hasAnyRejected = registrable.some((m) => regFor(m)?.status === "REJECTED");

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

        {/* Clear, always-visible status per member — nothing hidden */}
        <div className="space-y-1.5 pt-2" style={{ borderTop: "1px solid var(--mint-100)" }}>
          {eligibleMembers.map((m) => {
            const r = regFor(m);
            return (
              <div key={m.id} className="flex items-center justify-between gap-3 text-xs py-0.5">
                <span style={{ color: "var(--text-main)" }}>{m.fullName}</span>
                {r ? (
                  <div className="flex items-center gap-2">
                    <span className={`badge ${STATUS_CLASS[r.status]}`}>{STATUS_LABEL[r.status]}</span>
                    {r.status === "PENDING" && (
                      <button onClick={() => cancelPending(m.id)} className="font-bold" style={{ color: "#991b1b" }}>
                        إلغاء
                      </button>
                    )}
                  </div>
                ) : (
                  <span className="text-xs" style={{ color: "var(--text-muted)" }}>غير مسجَّل</span>
                )}
              </div>
            );
          })}
        </div>

        {!canRegister && registrable.length > 0 && (
          <p className="text-xs mt-2 pt-2" style={{ color: "var(--text-muted)", borderTop: "1px solid var(--mint-100)" }}>
            {!activity.isOpen ? "التسجيل في هذا النشاط مغلق حالياً" : "اكتمل عدد المسجلين في هذا النشاط"}
          </p>
        )}

        {canRegister && !expanded && (
          <button onClick={openForm} className="btn btn-primary text-sm mt-3">
            {hasAnyRejected ? "🔄 إعادة المحاولة" : "📝 سجّل الآن"} ←
          </button>
        )}

        {canRegister && expanded && (
          <div className="mt-3 pt-3 space-y-3" style={{ borderTop: "1px solid var(--mint-100)" }}>
            <p className="text-sm font-bold" style={{ color: "var(--text-main)" }}>
              للمشاركة: سجّل ثم ادفع{" "}
              <span style={{ color: "var(--copper-600)" }}>100 أوقية على الأقل</span>
              {" "}— يمكنك دعم النادي بمبلغ أكبر إن رغبت
            </p>

            {registrable.length > 1 && (
              <div className="space-y-1">
                {registrable.map((m) => {
                  const r = regFor(m);
                  return (
                    <div key={m.id}>
                      <label className="flex items-center gap-2 text-xs">
                        <input type="checkbox" checked={selected.includes(m.id)} onChange={() => toggle(m.id)} />
                        <span style={{ color: "var(--text-main)" }}>{m.fullName}</span>
                      </label>
                      {r?.status === "REJECTED" && r.rejectionReason && (
                        <p className="text-xs mr-6" style={{ color: "#991b1b" }}>سبب الرفض السابق: {r.rejectionReason}</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            <PaymentInfoBanner />

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

            <div className="flex gap-2">
              <button onClick={submit} disabled={submitting} className="btn btn-primary text-sm flex-1">
                {submitting ? "..." : "✅ تأكيد التسجيل"}
              </button>
              <button
                onClick={() => { setExpanded(false); setError(""); }}
                className="text-sm px-4 rounded-xl font-bold"
                style={{ background: "white", color: "var(--text-muted)", border: "1px solid var(--mint-200)" }}
              >
                إلغاء
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}