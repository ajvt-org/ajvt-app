"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { loginPathWithNext } from "@/lib/utils";
import { formatDayKey } from "@/lib/clubTime";
import IconLabel from "@/components/IconLabel";
import PageLoading from "@/components/PageLoading";
import { siteVisits as texts } from "@/lib/texts";

interface DayVisits {
  date: string;
  visitors: number;
  pageViews: number;
}

interface SiteStats {
  days: DayVisits[];
  today: number;
  yesterday: number;
  last7Days: number;
  last30Days: number;
}

function DailyVisitsChart({ days }: { days: DayVisits[] }) {
  const max = Math.max(1, ...days.map((d) => d.visitors));
  const width = 600;
  const height = 140;
  const baseline = height - 18;
  const barGap = 2;
  const barWidth = Math.min(24, width / days.length - barGap);
  const step = width / days.length;

  return (
    <div className="overflow-x-auto">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        style={{ width: "100%", height: "140px", display: "block" }}
      >
        <line
          x1={0}
          y1={baseline}
          x2={width}
          y2={baseline}
          style={{ stroke: "var(--mint-100)" }}
          strokeWidth={1}
        />
        {days.map((d, i) => {
          const barHeight = Math.max(1, (d.visitors / max) * (baseline - 8));
          const x = i * step + (step - barWidth) / 2;
          const y = baseline - barHeight;
          return (
            <rect
              key={d.date}
              x={x}
              y={y}
              width={barWidth}
              height={barHeight}
              rx={barHeight > 4 ? 4 : 1}
              style={{ fill: "var(--mint-500)" }}
            >
              <title>{texts.dayReading(formatDayKey(d.date), d.visitors, d.pageViews)}</title>
            </rect>
          );
        })}
      </svg>
      <div
        className="flex justify-between text-[10px] mt-1"
        style={{ color: "var(--text-muted)" }}
        dir="ltr"
      >
        <span>{days[0]?.date}</span>
        <span>{days[days.length - 1]?.date}</span>
      </div>
    </div>
  );
}

function Tile({ icon, label, value }: { icon: "user" | "calendar"; label: string; value: number }) {
  return (
    <div className="card p-3 text-center">
      <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>
        <IconLabel name={icon}>{label}</IconLabel>
      </p>
      <p className="text-base font-black" style={{ color: "var(--mint-600)" }}>
        {value}
      </p>
    </div>
  );
}

export default function VisitsPanel() {
  const router = useRouter();
  const [stats, setStats] = useState<SiteStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/site-stats")
      .then((r) => {
        if (r.status === 401) {
          router.push(loginPathWithNext("/admin/login"));
          return null;
        }
        return r.ok ? r.json() : null;
      })
      .then((data) => {
        if (data) setStats(data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return <PageLoading />;
  }

  const days = stats?.days || [];

  return (
    <div className="space-y-5">
      <p className="text-sm font-bold" style={{ color: "var(--text-main)" }}>
        <IconLabel name="chart">{texts.title}</IconLabel>
      </p>

      <div className="grid grid-cols-2 gap-2">
        <Tile icon="user" label={texts.today} value={stats?.today ?? 0} />
        <Tile icon="user" label={texts.yesterday} value={stats?.yesterday ?? 0} />
        <Tile icon="calendar" label={texts.last7Days} value={stats?.last7Days ?? 0} />
        <Tile icon="calendar" label={texts.last30Days} value={stats?.last30Days ?? 0} />
      </div>

      <div className="card p-4">
        <p className="text-xs font-bold mb-3" style={{ color: "var(--text-muted)" }}>
          {texts.chartTitle}
        </p>
        {days.every((d) => d.visitors === 0) ? (
          <p className="text-xs text-center py-8" style={{ color: "var(--text-muted)" }}>
            {texts.empty}
          </p>
        ) : (
          <DailyVisitsChart days={days} />
        )}
      </div>

      <div className="card p-4">
        <p className="text-xs font-bold mb-2" style={{ color: "var(--text-muted)" }}>
          {texts.dailyTitle}
        </p>
        <div className="space-y-1.5 max-h-64 overflow-y-auto">
          {[...days].reverse().map((d) => (
            <div key={d.date} className="flex items-center justify-between text-xs">
              <span dir="ltr" style={{ color: "var(--text-main)" }}>
                {formatDayKey(d.date)}
              </span>
              <span>
                <span className="font-black" style={{ color: "var(--mint-600)" }}>
                  {texts.visitors(d.visitors)}
                </span>
                <span style={{ color: "var(--text-muted)" }}>
                  {" "}
                  · {texts.pageViews(d.pageViews)}
                </span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
