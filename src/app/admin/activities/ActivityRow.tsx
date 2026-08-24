"use client";

import Link from "next/link";
import Icon from "@/components/Icon";
import IconLabel from "@/components/IconLabel";
import { toThumbUrl } from "@/lib/utils";
import { formatActivityDates } from "@/lib/activityDates";
import { countedNoun } from "@/lib/arabicCount";
import { REGISTERED } from "@/lib/messages";
import { activityRow as texts } from "@/lib/texts";
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

export default function ActivityRow({
  activity,
  canReorder,
  reorderLoading,
  onMove,
}: {
  activity: Activity;
  canReorder: { up: boolean; down: boolean } | null;
  reorderLoading: boolean;
  onMove: (direction: -1 | 1) => void;
}) {
  const a = activity;
  const registered = a.registrations.filter((r) => r.status !== "REJECTED").length;
  const pending = a.registrations.filter((r) => r.status === "PENDING").length;
  const dates = formatActivityDates(a);

  return (
    <div className="card w-full p-3 sm:p-4 flex items-center gap-3">
      <Link
        href={`/admin/activities/${a.id}`}
        className="flex items-center gap-3 min-w-0 flex-1"
        style={{ color: "var(--text-main)" }}
      >
        {a.photo ? (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={toThumbUrl(`/api/files/activity/${a.photo}`)}
            alt={a.title}
            className="w-10 h-10 rounded-xl object-cover shrink-0"
          />
        ) : (
          <span
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "var(--mint-100)" }}
          >
            <Icon name={a.isVolunteer ? "handshake" : "trophy"} size={18} />
          </span>
        )}
        <div className="min-w-0">
          <p className="text-sm font-bold truncate">{a.title}</p>
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
            {dates && (
              <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                {dates}
              </span>
            )}
            {!a.isVolunteer && (
              <Chip text={`${registered} ${countedNoun(registered, REGISTERED)}`} tone="muted" />
            )}
            {pending > 0 && <Chip text={texts.pendingChip(pending)} tone="warn" />}
            {a.isTournament && <Chip text={texts.tournamentChip} tone="brand" />}
            {a.isVolunteer && <Chip text={texts.volunteerChip} tone="brand" />}
            {!a.isOpen && <Chip text={texts.closedChip} tone="muted" />}
          </div>
        </div>
      </Link>
      <div className="shrink-0 flex items-center gap-1">
        {a.isTournament && (
          <Link
            href={`/admin/activities/${a.id}?tab=matches`}
            className="text-xs px-2.5 py-1.5 rounded-lg font-bold"
            style={{ background: "var(--mint-100)", color: "var(--mint-700)" }}
          >
            <IconLabel name="trophy">{texts.manageTournament}</IconLabel>
          </Link>
        )}
        {canReorder && (
          <>
            <button
              onClick={() => onMove(-1)}
              disabled={!canReorder.up || reorderLoading}
              aria-label={texts.moveUp(a.title)}
              className="w-8 h-8 rounded-lg flex items-center justify-center disabled:opacity-30"
              style={{ background: "var(--mint-50)", color: "var(--mint-700)" }}
            >
              <Icon name="chevronUp" size={15} />
            </button>
            <button
              onClick={() => onMove(1)}
              disabled={!canReorder.down || reorderLoading}
              aria-label={texts.moveDown(a.title)}
              className="w-8 h-8 rounded-lg flex items-center justify-center disabled:opacity-30"
              style={{ background: "var(--mint-50)", color: "var(--mint-700)" }}
            >
              <Icon name="chevronDown" size={15} />
            </button>
          </>
        )}
        <Link
          href={`/admin/activities/${a.id}`}
          aria-label={texts.open(a.title)}
          style={{ color: "var(--text-muted)" }}
        >
          ›
        </Link>
      </div>
    </div>
  );
}
