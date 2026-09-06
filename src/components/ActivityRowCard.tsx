"use client";

import Link from "next/link";
import Icon, { type IconName } from "@/components/Icon";
import { formatMatchDateTime } from "@/lib/clubTime";
import { UNDATED_LABEL } from "@/lib/matchDays";
import type { ActivityDetail, ActivityRow } from "@/lib/memberActivities";
import { withFrom } from "@/lib/backLink";

function opponent(detail: Extract<ActivityDetail, { kind: "NEXT_MATCH" }>): string {
  const { fixture } = detail;
  return fixture.myTeamId === fixture.firstTeam.id
    ? fixture.secondTeam.name
    : fixture.firstTeam.name;
}

function myTeam(detail: Extract<ActivityDetail, { kind: "NEXT_MATCH" }>): string {
  const { fixture } = detail;
  return fixture.myTeamId === fixture.firstTeam.id
    ? fixture.firstTeam.name
    : fixture.secondTeam.name;
}

function line(detail: ActivityDetail): { icon: IconName; text: string } {
  switch (detail.kind) {
    case "REJECTED":
      return { icon: "ban", text: "لم يُقبل طلب مشاركتك" };
    case "PENDING_REVIEW":
      return { icon: "clock", text: "طلبك قيد المراجعة" };
    case "NEXT_MATCH":
      return { icon: "ball", text: `${myTeam(detail)} ضد ${opponent(detail)}` };
    case "PARTNERS":
      return {
        icon: "users",
        text:
          detail.names.length > 1
            ? `شركاؤك ${detail.names.join("، ")}`
            : `شريكك ${detail.names[0]}`,
      };
    case "AWAITING_SCHEDULE":
      return { icon: "clock", text: `${detail.team} · في انتظار برمجة المباريات` };
    case "AWAITING_TEAM":
      return { icon: "users", text: "في انتظار انضمامك إلى فريق" };
    case "DATES":
      return { icon: "calendar", text: detail.text };
    case "TEAM":
      return { icon: "users", text: detail.name };
    default:
      return { icon: "check", text: "مسجّل" };
  }
}

function when(row: ActivityRow): string | null {
  if (row.detail.kind !== "NEXT_MATCH") return null;
  return row.detail.fixture.matchDate
    ? formatMatchDateTime(row.detail.fixture.matchDate)
    : UNDATED_LABEL;
}

export default function ActivityRowCard({ row, from }: { row: ActivityRow; from: string }) {
  const detail = line(row.detail);
  const stamp = when(row);

  return (
    <Link
      href={withFrom(`/activities/${row.activityId}`, from)}
      className="card p-3.5 space-y-1.5 block"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="font-bold truncate" style={{ color: "var(--text-main)" }}>
          {row.title}
        </p>
        {stamp && (
          <span className="text-xs shrink-0" style={{ color: "var(--mint-700)" }}>
            {stamp}
          </span>
        )}
      </div>
      <p
        className="text-xs flex items-center gap-1.5 truncate"
        style={{ color: "var(--text-muted)" }}
      >
        <Icon name={detail.icon} size={12} />
        {detail.text}
      </p>
    </Link>
  );
}
