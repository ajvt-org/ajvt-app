"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import IconLabel from "@/components/IconLabel";
import ArrowLabel from "@/components/ArrowLabel";
import ActivityRowCard from "@/components/ActivityRowCard";
import { myActivities } from "@/lib/texts";
import type { ActivityRow } from "@/lib/memberActivities";

const SHOWN = 3;

export default function MyActivities() {
  const [rows, setRows] = useState<ActivityRow[] | null>(null);

  useEffect(() => {
    fetch("/api/user/activities")
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => setRows(json?.rows ?? null))
      .catch(() => setRows(null));
  }, []);

  if (!rows || rows.length === 0) return null;

  const hasMatch = rows.some((r) => r.detail.kind === "NEXT_MATCH");

  return (
    <div className="space-y-2">
      <p className="text-sm font-bold" style={{ color: "var(--text-main)" }}>
        <IconLabel name="flag">{myActivities.title}</IconLabel>
      </p>

      {rows.slice(0, SHOWN).map((row) => (
        <ActivityRowCard key={row.activityId} row={row} from="/home" />
      ))}

      {hasMatch && (
        <Link
          href="/matches"
          className="text-xs font-bold block"
          style={{ color: "var(--mint-600)" }}
        >
          <ArrowLabel>{myActivities.allMatches}</ArrowLabel>
        </Link>
      )}
    </div>
  );
}
