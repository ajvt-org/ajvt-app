"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { loginPathWithNext } from "@/lib/utils";

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
              <title>
                {d.date} — {d.visitors} زائر ({d.pageViews} مشاهدة)
              </title>
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

export default function AdminStatsPage() {
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
    return (
      <div className="text-center py-16" style={{ color: "var(--mint-500)" }}>
        <div className="text-4xl animate-pulse mb-3">⏳</div>
        <p className="text-sm font-semibold">جاري التحميل...</p>
      </div>
    );
  }

  const days = stats?.days || [];

  return (
    <div className="admin-page space-y-5">
      <p className="text-sm font-bold" style={{ color: "var(--text-main)" }}>
        📊 إحصائيات الزيارات
      </p>

      <div className="grid grid-cols-2 gap-2">
        <div className="card p-3 text-center">
          <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>
            👤 زوار اليوم
          </p>
          <p className="text-base font-black" style={{ color: "var(--mint-600)" }}>
            {stats?.today ?? 0}
          </p>
        </div>
        <div className="card p-3 text-center">
          <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>
            👤 زوار الأمس
          </p>
          <p className="text-base font-black" style={{ color: "var(--mint-600)" }}>
            {stats?.yesterday ?? 0}
          </p>
        </div>
        <div className="card p-3 text-center">
          <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>
            📅 آخر 7 أيام
          </p>
          <p className="text-base font-black" style={{ color: "var(--mint-600)" }}>
            {stats?.last7Days ?? 0}
          </p>
        </div>
        <div className="card p-3 text-center">
          <p className="text-xs mb-1" style={{ color: "var(--text-muted)" }}>
            🗓️ آخر 30 يوماً
          </p>
          <p className="text-base font-black" style={{ color: "var(--mint-600)" }}>
            {stats?.last30Days ?? 0}
          </p>
        </div>
      </div>

      <div className="card p-4">
        <p className="text-xs font-bold mb-3" style={{ color: "var(--text-muted)" }}>
          تطور عدد الزوار يوميّاً (آخر 30 يوماً)
        </p>
        {days.every((d) => d.visitors === 0) ? (
          <p className="text-xs text-center py-8" style={{ color: "var(--text-muted)" }}>
            لا توجد زيارات مسجلة بعد
          </p>
        ) : (
          <DailyVisitsChart days={days} />
        )}
      </div>

      <div className="card p-4">
        <p className="text-xs font-bold mb-2" style={{ color: "var(--text-muted)" }}>
          التفاصيل اليومية
        </p>
        <div className="space-y-1.5 max-h-64 overflow-y-auto">
          {[...days].reverse().map((d) => (
            <div key={d.date} className="flex items-center justify-between text-xs" dir="ltr">
              <span style={{ color: "var(--text-main)" }}>{d.date}</span>
              <span>
                <span className="font-black" style={{ color: "var(--mint-600)" }}>
                  {d.visitors} زائر
                </span>
                <span style={{ color: "var(--text-muted)" }}> · {d.pageViews} مشاهدة</span>
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
