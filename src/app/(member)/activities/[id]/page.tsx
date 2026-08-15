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

      <div className="px-5 py-5 space-y-4">
        <div className="card overflow-hidden">
          {activity.photo && (
            <div className="pt-4 flex justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={toThumbUrl(`/api/files/activity/${activity.photo}`)}
                alt={activity.title}
                width={96}
                height={96}
                decoding="async"
                className="w-24 h-24 rounded-full object-cover"
                style={{ border: "2px solid var(--mint-200)" }}
              />
            </div>
          )}

          <div className="p-4">
            <div className="flex items-start justify-between gap-3 mb-1.5">
              <h2 className="font-bold" style={{ color: "var(--text-main)" }}>
                {activity.title}
              </h2>
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
              {activity.when && (
                <span>
                  <Icon name="calendar" size={13} className="icon-inline" />{" "}
                  <NumericRanges>{activity.when}</NumericRanges>
                </span>
              )}
              {activity.capacity !== null && (
                <span>
                  <Icon name="users" size={13} className="icon-inline" /> {activity.registrantCount}
                  /{activity.capacity}
                </span>
              )}
            </div>

            {activity.isTournament && (
              <Link
                href={`/tournament/${activity.id}`}
                className="text-xs px-4 py-2.5 rounded-xl font-bold inline-block mb-3"
                style={{ background: "var(--mint-100)", color: "var(--mint-700)" }}
              >
                <ArrowLabel>
                  <IconLabel name="trophy">عرض الترتيب</IconLabel>
                </ArrowLabel>
              </Link>
            )}

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
              <Link href="/form" className="btn btn-copper">
                <IconLabel name="pencil">سجّل الآن — أنشئ حسابك للمشاركة</IconLabel>
              </Link>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
