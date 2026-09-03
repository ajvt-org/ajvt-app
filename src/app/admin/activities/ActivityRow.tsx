"use client";

import Link from "next/link";
import ActivityRowBody from "@/components/ActivityRowBody";
import ActivityStandingChip from "@/components/ActivityStandingChip";
import { formatActivityDates } from "@/lib/activityDates";
import { countedNoun } from "@/lib/arabicCount";
import { REGISTERED } from "@/lib/messages";
import { activityAccent } from "@/lib/activityAccent";
import { activityRow as texts } from "@/lib/texts";
import ActivityRowMenu, { type RowMenuItem } from "./ActivityRowMenu";
import { CategoryChip, StatusChips, WaitingChips } from "./ActivityChips";
import { pendingCount, registeredCount } from "./activitiesList";
import type { Activity } from "./activityTypes";

function seats(activity: Activity): string {
  const registered = registeredCount(activity);
  if (activity.capacity === null) return `${registered} ${countedNoun(registered, REGISTERED)}`;
  return texts.registeredOf(registered, activity.capacity);
}

export interface RowControls {
  busy: boolean;
  setPublished: (id: string, published: boolean) => void;
  setOpen: (id: string, isOpen: boolean) => void;
  duplicate: (id: string) => void;
}

function menuItems(activity: Activity, controls: RowControls): RowMenuItem[] {
  const items: RowMenuItem[] = [];
  if (activity.isTournament) {
    items.push({
      key: "tournament",
      label: texts.manageTournament,
      icon: "trophy",
      href: `/admin/activities/${activity.id}?tab=matches`,
    });
  }
  items.push({
    key: "published",
    label: activity.published ? texts.unpublish : texts.publish,
    icon: activity.published ? "ban" : "check",
    onPick: () => controls.setPublished(activity.id, !activity.published),
  });
  items.push({
    key: "registration",
    label: activity.isOpen ? texts.closeRegistration : texts.openRegistration,
    icon: activity.isOpen ? "ban" : "check",
    onPick: () => controls.setOpen(activity.id, !activity.isOpen),
  });
  items.push({
    key: "duplicate",
    label: texts.duplicate,
    icon: "copy",
    onPick: () => controls.duplicate(activity.id),
  });
  return items;
}

export default function ActivityRow({
  activity,
  controls,
  selecting,
  picked,
  onPick,
}: {
  activity: Activity;
  controls: RowControls;
  selecting: boolean;
  picked: boolean;
  onPick: (id: string) => void;
}) {
  const a = activity;

  return (
    <div className={`card activity-row ${activityAccent(a)} w-full p-3 sm:p-4`}>
      <div className="flex items-center gap-2 min-w-0">
        {selecting && (
          <input
            type="checkbox"
            checked={picked}
            onChange={() => onPick(a.id)}
            aria-label={texts.pickRow(a.title)}
            className="w-4 h-4 shrink-0"
          />
        )}
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
            meta={
              <>
                <ActivityStandingChip
                  startsAt={a.startsAt}
                  endsAt={a.endsAt}
                  unplayedMatches={a.unplayedMatches}
                />
                <span className="shrink-0">{seats(a)}</span>
              </>
            }
            chips={
              <>
                <WaitingChips pending={pendingCount(a)} joins={a.pendingJoinRequests} />
                <StatusChips published={a.published} isOpen={a.isOpen} />
                <CategoryChip isTournament={a.isTournament} isVolunteer={a.isVolunteer} />
              </>
            }
          />
        </Link>
        <ActivityRowMenu label={texts.rowMenu(a.title)} items={menuItems(a, controls)} />
      </div>
    </div>
  );
}
