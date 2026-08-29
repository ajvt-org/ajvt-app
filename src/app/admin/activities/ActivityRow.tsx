"use client";

import Link from "next/link";
import Icon from "@/components/Icon";
import ActivityRowBody from "@/components/ActivityRowBody";
import { formatActivityDates } from "@/lib/activityDates";
import { countedNoun } from "@/lib/arabicCount";
import { REGISTERED } from "@/lib/messages";
import { activityAccent } from "@/lib/activityAccent";
import { activityRow as texts } from "@/lib/texts";
import ActivityRowMenu, { type RowMenuItem } from "./ActivityRowMenu";
import { pendingCount, registeredCount } from "./activitiesList";
import type { Activity } from "./activityTypes";

function Chip({ text, tone }: { text: string; tone: "warn" | "muted" | "brand" }) {
  const style =
    tone === "warn"
      ? { background: "#fef3c7", color: "#b45309" }
      : tone === "brand"
        ? { background: "var(--mint-100)", color: "var(--mint-700)" }
        : { background: "var(--mint-50)", color: "var(--text-muted)" };
  return (
    <span className="text-xs px-2 py-0.5 rounded-lg font-bold shrink-0" style={style}>
      {text}
    </span>
  );
}

function seats(activity: Activity): string {
  const registered = registeredCount(activity);
  if (activity.capacity === null) return `${registered} ${countedNoun(registered, REGISTERED)}`;
  return texts.registeredOf(registered, activity.capacity);
}

function menuItems(activity: Activity): RowMenuItem[] {
  if (!activity.isTournament) return [];
  return [
    {
      key: "tournament",
      label: texts.manageTournament,
      icon: "trophy",
      href: `/admin/activities/${activity.id}?tab=matches`,
    },
  ];
}

export default function ActivityRow({ activity }: { activity: Activity }) {
  const a = activity;
  const pending = pendingCount(a);

  return (
    <div className={`card activity-row ${activityAccent(a)} w-full p-3 sm:p-4`}>
      <div className="flex items-center gap-2 min-w-0">
        <Link
          href={`/admin/activities/${a.id}`}
          className="flex items-center gap-3 min-w-0 flex-1"
          style={{ color: "var(--text-main)" }}
        >
          <ActivityRowBody
            title={a.title}
            photo={a.photo}
            isVolunteer={a.isVolunteer}
            when={formatActivityDates(a)}
            chips={
              <>
                <Chip text={seats(a)} tone="muted" />
                {pending > 0 && <Chip text={texts.pendingChip(pending)} tone="warn" />}
                {a.pendingJoinRequests > 0 && (
                  <Chip text={texts.joinRequestChip(a.pendingJoinRequests)} tone="warn" />
                )}
                {a.isTournament && <Chip text={texts.tournamentChip} tone="brand" />}
                {a.isVolunteer && <Chip text={texts.volunteerChip} tone="brand" />}
                {!a.isOpen && <Chip text={texts.closedChip} tone="muted" />}
              </>
            }
          />
          <Icon name="chevronLeft" size={15} className="shrink-0" />
        </Link>
        <ActivityRowMenu label={texts.rowMenu(a.title)} items={menuItems(a)} />
      </div>
    </div>
  );
}
