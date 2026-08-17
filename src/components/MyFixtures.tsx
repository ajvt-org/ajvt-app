"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Icon from "@/components/Icon";
import IconLabel from "@/components/IconLabel";
import ArrowLabel from "@/components/ArrowLabel";
import FixtureRow from "@/components/FixtureRow";
import { emptyReason, type Fixture } from "@/lib/memberFixtures";

export interface FixturesResponse {
  teamCount: number;
  upcoming: Fixture[];
  past: Fixture[];
}

export function FixturesEmpty({ teamCount }: { teamCount: number }) {
  const reason = emptyReason(teamCount);

  return (
    <div className="card p-6 text-center">
      <div className="mb-2 flex justify-center">
        <Icon name="calendar" size={32} color="var(--mint-400)" />
      </div>
      <p className="font-semibold" style={{ color: "var(--text-main)" }}>
        {reason === "NO_TEAM" ? "لست في أي فريق بعد" : "لا توجد مباريات مبرمجة"}
      </p>
      <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
        {reason === "NO_TEAM"
          ? "سجّل في بطولة وسينضمّك المشرف إلى فريق."
          : "بمجرد برمجة مباراة لفريقك ستظهر هنا."}
      </p>
    </div>
  );
}

export default function MyFixtures() {
  const [data, setData] = useState<FixturesResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/user/matches")
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => setData(json))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading || !data) return null;

  const next = data.upcoming[0];

  return (
    <div className="space-y-2">
      <p className="text-sm font-bold" style={{ color: "var(--text-main)" }}>
        <IconLabel name="calendar">مبارياتي</IconLabel>
      </p>

      {next ? <FixtureRow fixture={next} /> : <FixturesEmpty teamCount={data.teamCount} />}

      {(data.upcoming.length > 1 || data.past.length > 0) && (
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
