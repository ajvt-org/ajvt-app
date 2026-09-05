"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Icon from "@/components/Icon";
import IconLabel from "@/components/IconLabel";
import ArrowLabel from "@/components/ArrowLabel";
import ActivityRowCard from "@/components/ActivityRowCard";
import type { ActivityRow } from "@/lib/memberActivities";

const SHOWN = 3;

export function ActivitiesEmpty() {
  return (
    <div className="card p-6 text-center">
      <div className="mb-2 flex justify-center">
        <Icon name="flag" size={32} color="var(--mint-400)" />
      </div>
      <p className="font-semibold" style={{ color: "var(--text-main)" }}>
        لست مشاركا في أي نشاط بعد
      </p>
      <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
        اختر نشاطا من القائمة أدناه وسجّل فيه.
      </p>
    </div>
  );
}

export default function MyActivities() {
  const [rows, setRows] = useState<ActivityRow[] | null>(null);

  useEffect(() => {
    fetch("/api/user/activities")
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => setRows(json?.rows ?? null))
      .catch(() => setRows(null));
  }, []);

  if (!rows) return null;

  const hasMatch = rows.some((r) => r.detail.kind === "NEXT_MATCH");

  return (
    <div className="space-y-2">
      <p className="text-sm font-bold" style={{ color: "var(--text-main)" }}>
        <IconLabel name="flag">أنشطتي</IconLabel>
      </p>

      {rows.length === 0 ? (
        <ActivitiesEmpty />
      ) : (
        rows
          .slice(0, SHOWN)
          .map((row) => <ActivityRowCard key={row.activityId} row={row} from="/home" />)
      )}

      {hasMatch && (
        <Link
          href="/matches"
          className="text-xs font-bold block"
          style={{ color: "var(--mint-600)" }}
        >
          <ArrowLabel>كل مبارياتي</ArrowLabel>
        </Link>
      )}
    </div>
  );
}
