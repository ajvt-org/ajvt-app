import { prisma } from "@/lib/prisma";

interface DayVisits {
  date: string;
  visitors: number;
  pageViews: number;
}

export async function getSiteStats(recentDays = 30) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - (recentDays - 1));
  const cutoffKey = cutoff.toISOString().slice(0, 10);

  const rows = await prisma.siteVisit.findMany({
    where: { date: { gte: cutoffKey } },
    select: { date: true, pageViews: true },
  });

  const byDay = new Map<string, { visitors: number; pageViews: number }>();
  for (const r of rows) {
    const entry = byDay.get(r.date) || { visitors: 0, pageViews: 0 };
    entry.visitors += 1;
    entry.pageViews += r.pageViews;
    byDay.set(r.date, entry);
  }

  const days: DayVisits[] = [];
  for (let i = recentDays - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    const entry = byDay.get(key);
    days.push({ date: key, visitors: entry?.visitors ?? 0, pageViews: entry?.pageViews ?? 0 });
  }

  const todayKey = new Date().toISOString().slice(0, 10);
  const yesterdayKey = days.length > 1 ? days[days.length - 2].date : todayKey;

  return {
    days,
    today: byDay.get(todayKey)?.visitors ?? 0,
    yesterday: byDay.get(yesterdayKey)?.visitors ?? 0,
    last7Days: days.slice(-7).reduce((sum, d) => sum + d.visitors, 0),
    last30Days: days.reduce((sum, d) => sum + d.visitors, 0),
  };
}
