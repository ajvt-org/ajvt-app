"use client";

import { useEffect, useState } from "react";
import PlayerAvatar from "@/components/tournament/PlayerAvatar";
import { useToast } from "@/components/Toast";
import { toThumbUrl } from "@/lib/utils";
import Link from "next/link";
import { api, errorMessage } from "@/lib/api";
import ArrowLabel from "./ArrowLabel";
import Icon from "@/components/Icon";
import IconLabel from "@/components/IconLabel";
import NumericRanges from "@/components/NumericRanges";

interface Team {
  id: string;
  name: string;
}

interface Activity {
  id: string;
  title: string;
  description: string;
  period: string | null;
  photo: string | null;
  capacity: number | null;
  isOpen: boolean;
  isTournament: boolean;
  isVolunteer: boolean;
  whatsappLink: string | null;
  registrantCount: number;
  teams: Team[];
}

interface MemberRegistration {
  activityId: string;
  status: "PENDING" | "ACTIVE" | "REJECTED";
  rejectionReason: string | null;
}

interface MemberTeamMembership {
  teamId: string;
  teamName: string;
  activityId: string;
  status: "PENDING" | "ACTIVE";
}

interface EligibleMember {
  id: string;
  fullName: string;
  photo: string | null;
  registrations: MemberRegistration[];
  teamMemberships: MemberTeamMembership[];
}

interface ActivitiesSectionProps {
  eligibleMembers: EligibleMember[];
  hasAnyMember: boolean;
  hasPendingMember: boolean;
  quizAccess: boolean;
  onReload: () => void;
}

const STATUS_LABEL: Record<string, string> = {
  PENDING: "⏳ قيد المراجعة",
  ACTIVE: "✅ مقبول",
  REJECTED: "❌ مرفوض",
};
const STATUS_CLASS: Record<string, string> = {
  PENDING: "badge-pending",
  ACTIVE: "badge-active",
  REJECTED: "badge-rejected",
};

function QuizCard({ quizAccess }: { quizAccess: boolean }) {
  return (
    <div className="card overflow-hidden">
      <div className="p-4 flex items-center gap-3">
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center text-2xl shrink-0"
          style={{
            background: quizAccess
              ? "linear-gradient(160deg, var(--mint-500), var(--mint-700))"
              : "var(--mint-100)",
          }}
        >
          🧠
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="font-bold" style={{ color: "var(--text-main)" }}>
            المسابقة الثقافية
          </h3>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
            {quizAccess
              ? "أسئلة يومية، نقاط، وترتيب بين المنتسبين 🔥"
              : "متاحة فقط للمنتسبين الذين دفعوا رسوم الانتساب"}
          </p>
        </div>
        {quizAccess ? (
          <a
            href="/quiz"
            className="text-xs px-3 py-2 rounded-lg font-bold shrink-0"
            style={{ background: "var(--mint-600)", color: "white" }}
          >
            <ArrowLabel>العب</ArrowLabel>
          </a>
        ) : (
          <span className="text-lg shrink-0" title="متاحة فقط للمنتسبين الذين دفعوا رسوم الانتساب">
            <Icon name="lock" size={18} />
          </span>
        )}
      </div>
    </div>
  );
}

export default function ActivitiesSection({
  eligibleMembers,
  hasAnyMember,
  hasPendingMember,
  quizAccess,
  onReload,
}: ActivitiesSectionProps) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/activities")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.activities) setActivities(data.activities);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="space-y-3" id="activities">
        <h2 className="font-black text-lg" style={{ color: "var(--text-main)" }}>
          🏆 أنشطة هذا الصيف
        </h2>
        <QuizCard quizAccess={quizAccess} />
        <div className="card p-4 animate-pulse space-y-3">
          <div className="h-4 rounded-lg w-2/3" style={{ background: "var(--mint-100)" }} />
          <div className="h-3 rounded-lg w-full" style={{ background: "var(--mint-100)" }} />
          <div className="h-3 rounded-lg w-4/5" style={{ background: "var(--mint-100)" }} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 fade-up" id="activities">
      <h2 className="font-black text-lg" style={{ color: "var(--text-main)" }}>
        🏆 أنشطة هذا الصيف
      </h2>

      <QuizCard quizAccess={quizAccess} />

      {activities.length > 0 && (
        <>
          {eligibleMembers.length === 0 && (
            <p className="text-sm px-1" style={{ color: "var(--text-muted)" }}>
              {hasPendingMember ? (
                "طلب انضمامك قيد المراجعة — بمجرد قبوله يمكنك التسجيل في الأنشطة."
              ) : hasAnyMember ? (
                "طلب انضمامك مرفوض حالياً — تواصل مع المشرف للتسجيل في الأنشطة."
              ) : (
                <>
                  تصفح الأنشطة المتاحة —{" "}
                  <a href="/form" className="font-bold" style={{ color: "var(--mint-600)" }}>
                    سجّل طلب انضمام
                  </a>{" "}
                  لتتمكن من التسجيل.
                </>
              )}
            </p>
          )}

          <div className="space-y-3">
            {activities.map((activity) => (
              <ActivityCard
                key={activity.id}
                activity={activity}
                eligibleMembers={eligibleMembers}
                onReload={onReload}
              />
            ))}
          </div>
        </>
      )}
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
  const showToast = useToast();

  function regFor(member: EligibleMember) {
    return member.registrations.find((r) => r.activityId === activity.id) || null;
  }

  function teamFor(member: EligibleMember) {
    return member.teamMemberships.find((tm) => tm.activityId === activity.id) || null;
  }

  async function pickTeam(memberId: string, teamId: string) {
    setError("");
    setBusyMemberId(memberId);
    try {
      await api.post(`/api/teams/${teamId}/join`, { memberId });
      showToast("تم إرسال طلب الانضمام — بانتظار موافقة المشرف");
      onReload();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusyMemberId(null);
    }
  }

  async function leaveTeam(memberId: string, teamId: string) {
    setError("");
    setBusyMemberId(memberId);
    try {
      await api.del(`/api/teams/${teamId}/join`, { memberId });
      showToast("تم إلغاء الطلب");
      onReload();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusyMemberId(null);
    }
  }

  const full = activity.capacity !== null && activity.registrantCount >= activity.capacity;

  async function register(memberId: string) {
    setError("");
    setBusyMemberId(memberId);
    try {
      await api.post("/api/activities/register", {
        activityId: activity.id,
        memberId,
      });
      showToast(activity.isVolunteer ? "تم تسجيلك كمتطوع 💚" : "تم التسجيل في النشاط");
      onReload();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusyMemberId(null);
    }
  }

  function registerVolunteer(memberId: string) {
    // Open the WhatsApp group synchronously in the click handler — a browser popup
    // blocker would kill the redirect if it happened after the register() await below.
    if (activity.whatsappLink) window.open(activity.whatsappLink, "_blank", "noopener,noreferrer");
    register(memberId);
  }

  async function cancelPending(memberId: string) {
    try {
      await fetch("/api/activities/register", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId, activityId: activity.id }),
      });
      showToast("تم إلغاء الطلب");
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
            src={toThumbUrl(`/api/files/activity/${activity.photo}`)}
            alt={activity.title}
            width={96}
            height={96}
            loading="lazy"
            decoding="async"
            className="w-24 h-24 rounded-full object-cover"
            style={{ border: "2px solid var(--mint-200)" }}
          />
        </div>
      )}
      <div className="p-4">
        <div className="flex items-start justify-between gap-3 mb-1.5">
          <h3 className="font-bold" style={{ color: "var(--text-main)" }}>
            {activity.title}
          </h3>
          {activity.isOpen ? (
            <span className="badge badge-open shrink-0 font-bold">
              <span className="badge-dot" aria-hidden="true" />
              التسجيل مفتوح
            </span>
          ) : (
            <span className="badge badge-rejected shrink-0">مغلق</span>
          )}
        </div>
        <p className="text-sm mb-2" style={{ color: "var(--text-muted)" }}>
          {activity.description}
        </p>
        <div
          className="flex items-center gap-3 text-xs mb-3"
          style={{ color: "var(--text-muted)" }}
        >
          {activity.period && (
            <span>
              📅 <NumericRanges>{activity.period}</NumericRanges>
            </span>
          )}
          {activity.capacity !== null && (
            <span>
              👥 {activity.registrantCount}/{activity.capacity}
            </span>
          )}
        </div>

        {activity.isTournament && (
          <Link
            href={`/tournament/${activity.id}`}
            className="text-xs px-4 py-2.5 rounded-xl font-bold inline-block mb-3"
            style={{ background: "var(--mint-100)", color: "var(--mint-700)" }}
          >
            <ArrowLabel>🏆 عرض الترتيب</ArrowLabel>
          </Link>
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
                    <span className="truncate" style={{ color: "var(--text-main)" }}>
                      {m.fullName}
                    </span>
                  </div>
                  {settled ? (
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`badge ${STATUS_CLASS[r!.status]}`}>
                        {STATUS_LABEL[r!.status]}
                      </span>
                      {r!.status === "PENDING" && (
                        <button
                          onClick={() => cancelPending(m.id)}
                          className="font-bold"
                          style={{ color: "#991b1b" }}
                        >
                          إلغاء
                        </button>
                      )}
                    </div>
                  ) : activity.isOpen && !full ? (
                    <button
                      onClick={() =>
                        activity.isVolunteer ? registerVolunteer(m.id) : register(m.id)
                      }
                      disabled={busyMemberId === m.id}
                      className="text-xs px-3 py-1.5 rounded-lg font-bold shrink-0"
                      style={{ background: "var(--mint-600)", color: "white" }}
                    >
                      {busyMemberId === m.id ? (
                        "..."
                      ) : r?.status === "REJECTED" ? (
                        <IconLabel name="refresh">إعادة المحاولة</IconLabel>
                      ) : activity.isVolunteer ? (
                        "🤝 تطوع"
                      ) : (
                        "📝 سجّل"
                      )}
                    </button>
                  ) : (
                    <span className="text-xs shrink-0" style={{ color: "var(--text-muted)" }}>
                      {!activity.isOpen ? "التسجيل مغلق" : "اكتمل العدد"}
                    </span>
                  )}
                </div>
                {r?.status === "REJECTED" && r.rejectionReason && (
                  <p className="text-xs mr-8" style={{ color: "#991b1b" }}>
                    سبب الرفض السابق: {r.rejectionReason}
                  </p>
                )}
                {r?.status === "ACTIVE" &&
                  activity.isTournament &&
                  activity.teams.length > 0 &&
                  (() => {
                    const myTeam = teamFor(m);
                    const locked = myTeam?.status === "ACTIVE";
                    return (
                      <div className="mr-8 mt-1.5">
                        <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>
                          🏳️ {locked ? "فريقك:" : "اختر فريقك (اختياري):"}
                        </p>
                        {locked ? (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="badge badge-active">✓ {myTeam!.teamName}</span>
                            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                              تم التأكيد — لا يمكن تغييره
                            </span>
                          </div>
                        ) : (
                          <div className="flex flex-wrap items-center gap-1.5">
                            {activity.teams.map((t) => {
                              const mine = myTeam?.teamId === t.id;
                              return (
                                <button
                                  key={t.id}
                                  onClick={() => pickTeam(m.id, t.id)}
                                  disabled={busyMemberId === m.id || mine}
                                  className="text-xs px-2.5 py-1 rounded-lg font-bold"
                                  style={{
                                    background: mine ? "var(--mint-600)" : "white",
                                    color: mine ? "white" : "var(--mint-700)",
                                    border: "1px solid var(--mint-200)",
                                  }}
                                >
                                  {mine ? "⏳ " : ""}
                                  {t.name}
                                </button>
                              );
                            })}
                            {myTeam && (
                              <>
                                <span className="badge badge-pending" style={{ fontSize: "10px" }}>
                                  ⏳ بانتظار الموافقة
                                </span>
                                <button
                                  onClick={() => leaveTeam(m.id, myTeam.teamId)}
                                  disabled={busyMemberId === m.id}
                                  className="text-xs font-bold"
                                  style={{ color: "#991b1b" }}
                                >
                                  إلغاء الطلب
                                </button>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })()}
              </div>
            );
          })}
        </div>

        {error && (
          <div
            className="p-2.5 rounded-xl text-xs font-semibold mt-2"
            style={{ background: "#fee2e2", color: "#991b1b" }}
          >
            ⚠️ {error}
          </div>
        )}
      </div>
    </div>
  );
}
