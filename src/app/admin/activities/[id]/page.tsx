"use client";

import { Suspense, use, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { loginPathWithNext, toThumbUrl } from "@/lib/utils";
import Icon from "@/components/Icon";
import ArrowLabel from "@/components/ArrowLabel";
import ActivityFinance from "./ActivityFinance";
import WorkspaceTabs, { type WorkspaceTab } from "@/components/admin/WorkspaceTabs";
import DetailsTab from "./DetailsTab";
import RegistrationsTab from "./RegistrationsTab";
import LogTab from "./LogTab";
import IconLabel from "@/components/IconLabel";
import TournamentPanel from "@/components/admin/tournament/TournamentPanel";
import {
  isTournamentTab,
  tournamentTabs,
  type TournamentTabKey,
} from "@/components/admin/tournament/tournamentTabs";
import { useTournamentData } from "@/components/admin/tournament/useTournamentData";
import type { ActivityDetail } from "@/components/admin/activityDetailTypes";
import { countedNoun } from "@/lib/arabicCount";
import { ACCEPTED, REQUEST } from "@/lib/messages";
import { activityWorkspace as texts } from "@/lib/texts";

function tabsFor(activity: ActivityDetail["activity"], pendingProposals: number): WorkspaceTab[] {
  const pending = activity.registrations.filter((r) => r.status === "PENDING").length;
  const tabs: WorkspaceTab[] = [{ key: "details", label: texts.tabs.details, icon: "pencil" }];
  if (!activity.isVolunteer) {
    tabs.push({
      key: "registrations",
      label: texts.tabs.registrations,
      icon: "users",
      badge: pending,
    });
  }
  tabs.push(...tournamentTabs(activity, pendingProposals));
  tabs.push({ key: "finance", label: texts.tabs.finance, icon: "wallet" });
  tabs.push({ key: "log", label: texts.tabs.log, icon: "list" });
  return tabs;
}

function AdminActivityPageInner({ id }: { id: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [data, setData] = useState<ActivityDetail | null>(null);
  const [missing, setMissing] = useState(false);
  const [loading, setLoading] = useState(true);

  function load() {
    return fetch(`/api/admin/activities/${id}/detail`)
      .then((r) => {
        if (r.status === 401) {
          router.push(loginPathWithNext("/admin/login"));
          return null;
        }
        if (r.status === 404) {
          setMissing(true);
          return null;
        }
        return r.ok ? r.json() : null;
      })
      .then((json: ActivityDetail | null) => {
        if (json) setData(json);
      })
      .catch(() => {});
  }

  useEffect(() => {
    load().finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const isTournament = data?.activity.isTournament ?? false;
  const tournament = useTournamentData(id, isTournament);
  const pendingProposals = tournament.suspensions.filter((s) => s.status === "PROPOSED").length;

  if (loading) {
    return (
      <p className="admin-page text-sm text-center py-16" style={{ color: "var(--mint-500)" }}>
        {texts.loading}
      </p>
    );
  }

  if (missing || !data) {
    return (
      <div className="admin-page text-center py-16 space-y-3">
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          {texts.notFound}
        </p>
        <Link
          href="/admin/activities"
          className="text-sm font-bold"
          style={{ color: "var(--mint-600)" }}
        >
          <ArrowLabel direction="back">{texts.backToIndex}</ArrowLabel>
        </Link>
      </div>
    );
  }

  const { activity, history } = data;
  const accepted = activity.registrations.filter((r) => r.status === "ACTIVE").length;
  const tabs = tabsFor(activity, pendingProposals);
  const requested = searchParams.get("tab") || tabs[0].key;
  const tab = tabs.some((t) => t.key === requested) ? requested : tabs[0].key;

  function pickTab(key: string) {
    router.replace(`/admin/activities/${id}?tab=${key}`, { scroll: false });
  }

  return (
    <div className="admin-page space-y-4">
      <Link
        href="/admin/activities"
        className="text-sm font-bold"
        style={{ color: "var(--mint-600)" }}
      >
        <ArrowLabel direction="back">{texts.backToIndex}</ArrowLabel>
      </Link>

      <div className="card p-4 space-y-3">
        <div className="flex items-center gap-3">
          {activity.photo ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              src={toThumbUrl(`/api/files/activity/${activity.photo}`)}
              alt={activity.title}
              className="w-14 h-14 rounded-xl object-cover shrink-0"
            />
          ) : (
            <span
              className="w-14 h-14 rounded-xl flex items-center justify-center shrink-0"
              style={{ background: "var(--mint-100)" }}
            >
              <Icon name={activity.isVolunteer ? "handshake" : "trophy"} size={24} />
            </span>
          )}
          <div className="min-w-0 flex-1 space-y-1">
            <p
              className="font-black text-base"
              style={{ color: "var(--text-main)", overflowWrap: "anywhere" }}
            >
              {activity.title}
            </p>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              {accepted} {countedNoun(accepted, ACCEPTED)} من {activity.registrations.length}{" "}
              {countedNoun(activity.registrations.length, REQUEST)}
              {activity.capacity !== null ? ` · ${texts.capacity} ${activity.capacity}` : ""}
            </p>
          </div>
        </div>
        {activity.isTournament && (
          <div className="flex justify-end">
            <a
              href={`/tournament/${activity.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs px-3 py-1.5 rounded-lg font-bold"
              style={{ background: "var(--mint-100)", color: "var(--mint-700)" }}
            >
              <IconLabel name="link">{texts.publicPage}</IconLabel>
            </a>
          </div>
        )}
      </div>

      <WorkspaceTabs tabs={tabs} active={tab} onPick={pickTab} />

      {tab === "details" && <DetailsTab activity={activity} onSaved={load} />}
      {tab === "registrations" && <RegistrationsTab activity={activity} onChanged={load} />}
      {isTournamentTab(tab) && (
        <TournamentPanel activityId={activity.id} tab={tab as TournamentTabKey} data={tournament} />
      )}
      {tab === "finance" && <ActivityFinance activityId={activity.id} />}
      {tab === "log" && <LogTab history={history} />}
    </div>
  );
}

export default function AdminActivityPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return (
    <Suspense fallback={null}>
      <AdminActivityPageInner id={id} />
    </Suspense>
  );
}
