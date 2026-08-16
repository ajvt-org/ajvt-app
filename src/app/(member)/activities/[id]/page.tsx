"use client";

import { useEffect, useState } from "react";
import { use } from "react";
import Link from "next/link";
import PageHeader from "@/components/PageHeader";
import Icon from "@/components/Icon";
import IconLabel from "@/components/IconLabel";
import ArrowLabel from "@/components/ArrowLabel";
import NumericRanges from "@/components/NumericRanges";
import ActivityRegistrations from "@/components/ActivityRegistrations";
import { toThumbUrl } from "@/lib/utils";
import type { Activity, EligibleMember } from "@/components/activityTypes";

type MemberFromApi = {
  id: string;
  fullName: string;
  photo: string | null;
  status: string;
  registrations: { activityId: string; status: string; rejectionReason: string | null }[];
  teamMemberships: {
    status: string;
    team: { id: string; name: string; activityId: string };
  }[];
};

export default function ActivityPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [activity, setActivity] = useState<Activity | null>(null);
  const [eligibleMembers, setEligibleMembers] = useState<EligibleMember[]>([]);
  const [signedIn, setSignedIn] = useState(true);
  const [loading, setLoading] = useState(true);

  async function load() {
    try {
      const [activitiesRes, meRes] = await Promise.all([
        fetch("/api/activities"),
        fetch("/api/user/me"),
      ]);
      const { activities } = await activitiesRes.json();
      setActivity((activities || []).find((a: Activity) => a.id === id) ?? null);

      // A visitor with no account still gets the page; what they cannot do is
      // register, and that is where they are asked to create one.
      if (meRes.status === 401) {
        setSignedIn(false);
        setEligibleMembers([]);
        return;
      }
      const { members } = await meRes.json();
      setEligibleMembers(
        (members || [])
          .filter((m: MemberFromApi) => m.status === "ACTIVE")
          .map((m: MemberFromApi) => ({
            id: m.id,
            fullName: m.fullName,
            photo: m.photo,
            registrations: m.registrations.map((r) => ({
              activityId: r.activityId,
              status: r.status,
              rejectionReason: r.rejectionReason,
            })),
            teamMemberships: m.teamMemberships.map((tm) => ({
              teamId: tm.team.id,
              teamName: tm.team.name,
              activityId: tm.team.activityId,
              status: tm.status,
            })),
          })),
      );
    } catch {
      setSignedIn(false);
    }
  }

  // The spinner is turned off once the fetch settles, which the rule reads as
  // a cascading render because this effect re-runs when the id changes.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load().finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (loading) {
    return (
      <div className="app-shell flex items-center justify-center">
        <p className="text-sm font-semibold" style={{ color: "var(--mint-500)" }}>
          جاري التحميل...
        </p>
      </div>
    );
  }

  if (!activity) {
    return (
      <div className="app-shell">
        <PageHeader title="النشاط" backHref={signedIn ? "/home" : "/activities"} />
        <div className="px-5 py-10 text-center space-y-3">
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            لم نجد هذا النشاط.
          </p>
          <Link
            href={signedIn ? "/home" : "/activities"}
            className="text-sm font-bold"
            style={{ color: "var(--mint-600)" }}
          >
            <ArrowLabel direction="back">الأنشطة</ArrowLabel>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <PageHeader title={activity.title} backHref={signedIn ? "/home" : "/activities"} />

      {/* The picture leads, at whatever shape it was uploaded. */}
      <div className="activity-hero">
        {activity.photo ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={toThumbUrl(`/api/files/activity/${activity.photo}`)}
              alt=""
              aria-hidden="true"
              className="activity-hero-blur"
            />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`/api/files/activity/${activity.photo}`}
              alt={activity.title}
              decoding="async"
              className="activity-hero-img"
            />
          </>
        ) : (
          <span className="activity-hero-empty">
            <Icon name={activity.isVolunteer ? "handshake" : "trophy"} size={72} />
          </span>
        )}
        <span className="activity-hero-badge">
          {activity.isOpen ? (
            <span className="badge badge-open font-bold">
              <span className="badge-dot" aria-hidden="true" />
              التسجيل مفتوح
            </span>
          ) : (
            <span className="badge badge-rejected">مغلق</span>
          )}
        </span>
      </div>

      <div className="px-5 py-5 space-y-4">
        {(activity.when || activity.capacity !== null) && (
          <div className="space-y-2">
            <div
              className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm"
              style={{ color: "var(--text-muted)" }}
            >
              {activity.when && (
                <span>
                  <Icon name="calendar" size={14} className="icon-inline" />{" "}
                  <NumericRanges>{activity.when}</NumericRanges>
                </span>
              )}
              {activity.capacity !== null && (
                <span>
                  <Icon name="users" size={14} className="icon-inline" /> {activity.registrantCount}
                  {" / "}
                  {activity.capacity} مشارك
                </span>
              )}
            </div>

            {activity.capacity !== null && (
              <div className="capacity-bar" aria-hidden="true">
                <span
                  style={{
                    width: `${Math.min(100, Math.round((activity.registrantCount / activity.capacity) * 100))}%`,
                  }}
                />
              </div>
            )}
          </div>
        )}

        <p className="text-sm" style={{ color: "var(--text-main)", lineHeight: 1.8 }}>
          {activity.description}
        </p>

        {activity.isTournament && (
          <Link
            href={`/tournament/${activity.id}`}
            className="btn"
            style={{ background: "var(--mint-100)", color: "var(--mint-700)" }}
          >
            <ArrowLabel>
              <IconLabel name="trophy">عرض الترتيب</IconLabel>
            </ArrowLabel>
          </Link>
        )}

        <div className="pt-1" style={{ borderTop: "1px solid var(--mint-100)" }}>
          <div className="pt-3">
            {signedIn ? (
              <ActivityRegistrations
                activity={activity}
                eligibleMembers={eligibleMembers}
                onReload={load}
              />
            ) : activity.isVolunteer && activity.whatsappLink ? (
              <a
                href={activity.whatsappLink}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-whatsapp"
              >
                <IconLabel name="handshake">انضم كمتطوع الآن — واتساب</IconLabel>
              </a>
            ) : (
              <div className="space-y-2.5">
                <Link href={`/form?from=/activities/${id}`} className="btn btn-copper">
                  <IconLabel name="pencil">سجّل الآن — أنشئ حسابك للمشاركة</IconLabel>
                </Link>
                <Link
                  href={`/login?next=${encodeURIComponent(`/activities/${id}`)}`}
                  className="text-sm font-bold block text-center"
                  style={{ color: "var(--mint-600)" }}
                >
                  لديك حساب؟ تسجيل الدخول
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
