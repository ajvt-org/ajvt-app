"use client";

import { useEffect, useState } from "react";
import { toThumbUrl } from "@/lib/utils";
import Link from "next/link";
import ArrowLabel from "./ArrowLabel";
import Icon from "@/components/Icon";
import IconLabel from "@/components/IconLabel";
import NumericRanges from "@/components/NumericRanges";
import type { Activity, EligibleMember } from "./activityTypes";

interface ActivitiesSectionProps {
  eligibleMembers: EligibleMember[];
  hasAnyMember: boolean;
  hasPendingMember: boolean;
  quizAccess: boolean;
}

function QuizCard({ quizAccess }: { quizAccess: boolean }) {
  return (
    <div className="card overflow-hidden">
      <div className="p-4 flex items-center gap-3">
        <div
          className="w-14 h-14 rounded-full flex items-center justify-center shrink-0"
          style={{
            background: quizAccess
              ? "linear-gradient(160deg, var(--mint-500), var(--mint-700))"
              : "var(--mint-100)",
            color: quizAccess ? "#fff" : "var(--mint-700)",
          }}
        >
          <Icon name="quiz" size={28} />
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
          <IconLabel name="trophy">أنشطة هذا الصيف</IconLabel>
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
        <IconLabel name="trophy">أنشطة هذا الصيف</IconLabel>
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
}: {
  activity: Activity;
  eligibleMembers: EligibleMember[];
}) {
  // A row says what the activity is and where this account stands with it.
  // Anything per-person waits for the activity's own page, because an account
  // can hold several members and repeating them in every row read as several
  // accounts.
  const registered = eligibleMembers.filter((m) =>
    m.registrations.some((r) => r.activityId === activity.id && r.status !== "REJECTED"),
  ).length;

  return (
    <Link href={`/activities/${activity.id}`} className="card p-3.5 flex items-center gap-3">
      {activity.photo ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={toThumbUrl(`/api/files/activity/${activity.photo}`)}
          alt=""
          width={44}
          height={44}
          loading="lazy"
          decoding="async"
          className="w-11 h-11 rounded-full object-cover shrink-0"
          style={{ border: "1.5px solid var(--mint-200)" }}
        />
      ) : (
        <span
          className="w-11 h-11 rounded-full shrink-0 flex items-center justify-center"
          style={{ background: "var(--mint-100)", color: "var(--mint-700)" }}
        >
          <Icon name={activity.isVolunteer ? "handshake" : "trophy"} size={20} />
        </span>
      )}

      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="font-bold truncate" style={{ color: "var(--text-main)" }}>
            {activity.title}
          </span>
          {!activity.isOpen && (
            <span className="badge badge-rejected shrink-0" style={{ fontSize: "10px" }}>
              مغلق
            </span>
          )}
        </span>
        <span
          className="flex items-center gap-3 text-xs mt-0.5"
          style={{ color: "var(--text-muted)" }}
        >
          {activity.when && (
            <span>
              <Icon name="calendar" size={12} className="icon-inline" />{" "}
              <NumericRanges>{activity.when}</NumericRanges>
            </span>
          )}
          {registered > 0 && (
            <span style={{ color: "var(--mint-600)" }}>
              <Icon name="check" size={12} className="icon-inline" /> مسجَّل
              {registered > 1 ? ` (${registered})` : ""}
            </span>
          )}
        </span>
      </span>

      <Icon name="chevronLeft" size={16} className="shrink-0" />
    </Link>
  );
}
