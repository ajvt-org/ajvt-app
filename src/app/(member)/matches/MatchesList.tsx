"use client";

import { useEffect, useState } from "react";
import FixtureRow from "@/components/FixtureRow";
import FixturesEmpty from "@/components/FixturesEmpty";
import type { FixturesResponse } from "@/lib/memberFixtures";

function Section({ title, fixtures }: { title: string; fixtures: FixturesResponse["upcoming"] }) {
  if (fixtures.length === 0) return null;

  return (
    <div className="space-y-2">
      <p className="text-sm font-bold" style={{ color: "var(--text-main)" }}>
        {title}
      </p>
      {fixtures.map((fixture) => (
        <FixtureRow key={fixture.id} fixture={fixture} />
      ))}
    </div>
  );
}

export default function MatchesList() {
  const [data, setData] = useState<FixturesResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/user/matches")
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => setData(json))
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="px-5 py-16 text-center" style={{ color: "var(--mint-500)" }}>
        <p className="text-sm font-semibold">جاري التحميل...</p>
      </div>
    );
  }

  if (!data || (data.upcoming.length === 0 && data.past.length === 0)) {
    return (
      <div className="px-5 py-6">
        <FixturesEmpty teamCount={data?.teamCount ?? 0} />
      </div>
    );
  }

  return (
    <div className="px-5 py-6 pb-10 space-y-5">
      <Section title="القادمة" fixtures={data.upcoming} />
      <Section title="السابقة" fixtures={data.past} />
    </div>
  );
}
