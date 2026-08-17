import PageHeader from "@/components/PageHeader";
import Icon from "@/components/Icon";
import AgeStandingsTable from "@/components/AgeStandingsTable";
import { getAgeStandings } from "@/lib/ageStandingsServer";
import { getViewerAge } from "@/lib/viewerAge";

export const dynamic = "force-dynamic";

export default async function AgeStandingsPage() {
  const [standings, mine] = await Promise.all([getAgeStandings(), getViewerAge()]);
  const joined = standings.reduce((sum, s) => sum + s.members, 0);

  return (
    <div className="app-shell">
      <PageHeader title="ترتيب الأعصار" />

      <div className="px-5 py-6 pb-10 space-y-5">
        {standings.length === 0 ? (
          <div className="card p-8 text-center">
            <div className="mb-3 flex justify-center">
              <Icon name="users" size={40} color="var(--mint-400)" />
            </div>
            <p className="font-semibold" style={{ color: "var(--text-main)" }}>
              لا توجد أعصار بعد
            </p>
          </div>
        ) : (
          <>
            <div
              className="card p-4 text-center"
              style={{ background: "var(--mint-50)", border: "1.5px solid var(--mint-300)" }}
            >
              <p className="text-2xl font-black" style={{ color: "var(--mint-700)" }}>
                {joined}
              </p>
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                منتسب في {standings.length} أعصار
              </p>
            </div>

            <AgeStandingsTable standings={standings} mine={mine} />
          </>
        )}
      </div>
    </div>
  );
}
