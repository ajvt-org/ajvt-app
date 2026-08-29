"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import ArrowLabel from "./ArrowLabel";
import Icon from "@/components/Icon";
import ActivityRowBody from "@/components/ActivityRowBody";
import { activityAccent } from "@/lib/activityAccent";
import ActivityStandingChip from "./ActivityStandingChip";
import { memberActivities as texts } from "@/lib/texts";
import type { Activity, EligibleMember } from "./activityTypes";

interface ActivitiesSectionProps {
  eligibleMember: EligibleMember | null;
  quizAccess: boolean;
}

function QuizCard({ quizAccess }: { quizAccess: boolean }) {
  return (
    <div
      className="card overflow-hidden"
      style={{
        background: "linear-gradient(160deg, var(--mint-100), #fff 65%)",
        border: "1.5px solid var(--mint-500)",
      }}
    >
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
            {texts.quizTitle}
          </h3>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
            {quizAccess ? texts.quizSub : texts.quizLocked}
          </p>
        </div>
        {quizAccess ? (
          <a
            href="/quiz"
            className="text-xs px-3 py-2 rounded-lg font-bold shrink-0"
            style={{ background: "var(--mint-600)", color: "white" }}
          >
            <ArrowLabel>{texts.play}</ArrowLabel>
          </a>
        ) : (
          <span className="text-lg shrink-0" title={texts.quizLocked}>
            <Icon name="lock" size={18} />
          </span>
        )}
      </div>
    </div>
  );
}

export default function ActivitiesSection({ eligibleMember, quizAccess }: ActivitiesSectionProps) {
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
        <div className="pb-4 mb-1" style={{ borderBottom: "1px solid var(--mint-200)" }}>
          <QuizCard quizAccess={quizAccess} />
        </div>
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
      <div className="pb-4 mb-1" style={{ borderBottom: "1px solid var(--mint-200)" }}>
        <QuizCard quizAccess={quizAccess} />
      </div>

      {activities.length > 0 && (
        <>
          {!eligibleMember && (
            <p className="text-sm px-1" style={{ color: "var(--text-muted)" }}>
              {texts.browseNotice}
            </p>
          )}

          <div className="space-y-3">
            {activities.map((activity) => (
              <ActivityCard key={activity.id} activity={activity} member={eligibleMember} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function ActivityCard({ activity, member }: { activity: Activity; member: EligibleMember | null }) {
  const registered = !!member?.registrations.some(
    (r) => r.activityId === activity.id && r.status !== "REJECTED",
  );

  return (
    <Link
      href={`/activities/${activity.id}`}
      className={`card activity-row ${activityAccent(activity)} p-3.5 flex items-center gap-3`}
    >
      <ActivityRowBody
        title={activity.title}
        photo={activity.photo}
        isVolunteer={activity.isVolunteer}
        when={activity.when}
        meta={
          registered && (
            <span className="flex items-center gap-1.5" style={{ color: "var(--mint-600)" }}>
              <Icon name="check" size={12} />
              {texts.registeredChip}
            </span>
          )
        }
        chips={
          <>
            <ActivityStandingChip startsAt={activity.startsAt} endsAt={activity.endsAt} />
            {!activity.isOpen && (
              <span className="badge badge-rejected shrink-0" style={{ fontSize: "10px" }}>
                {texts.closedChip}
              </span>
            )}
          </>
        }
      />
      <Icon name="chevronLeft" size={16} className="shrink-0" />
    </Link>
  );
}
