import Image from "next/image";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { groupStandings, computeTopScorers, computeStats } from "@/lib/tournament";

export const dynamic = "force-dynamic";

const CARD_LABEL: Record<string, string> = { YELLOW: "🟨", RED: "🟥" };

export default async function PublicTournamentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const activity = await prisma.activity.findUnique({
    where: { id },
    select: {
      id: true,
      title: true,
      description: true,
      period: true,
      isTournament: true,
      groups: { select: { id: true, name: true } },
      teams: { select: { id: true, name: true, groupId: true } },
      matches: {
        orderBy: [{ status: "asc" }, { matchDate: "asc" }, { createdAt: "asc" }],
        select: {
          id: true,
          homeTeam: { select: { id: true, name: true } },
          awayTeam: { select: { id: true, name: true } },
          matchDate: true,
          round: true,
          venue: true,
          isKnockout: true,
          homeScore: true,
          awayScore: true,
          homePenalties: true,
          awayPenalties: true,
          status: true,
          manOfTheMatch: { select: { fullName: true } },
          goals: {
            select: { count: true, teamId: true, member: { select: { id: true, fullName: true } } },
          },
          bookings: {
            select: { cardType: true, minute: true, teamId: true, member: { select: { fullName: true } } },
          },
        },
      },
    },
  });

  if (!activity || !activity.isTournament) {
    notFound();
  }

  const standingsByGroup = groupStandings(activity.teams, activity.matches);
  const topScorers = computeTopScorers(activity.teams, activity.matches);
  const stats = computeStats(activity.teams, activity.matches);
  const groupNameById = new Map(activity.groups.map((g) => [g.id, g.name]));
  const singleFlatTable = standingsByGroup.length === 1 && standingsByGroup[0].groupId === null;

  const played = activity.matches.filter((m) => m.status === "PLAYED");
  const scheduled = activity.matches.filter((m) => m.status === "SCHEDULED");

  return (
    <div className="app-shell">
      <div
        className="px-5 py-4 flex items-center gap-3"
        style={{ background: "linear-gradient(135deg, var(--mint-700), var(--mint-600))" }}
      >
        <Image src="/version-final.png" alt="شعار" width={38} height={38} />
        <div>
          <p className="text-xs" style={{ color: "rgba(255,255,255,0.7)" }}>رابطة شباب قرية التاكلالت</p>
          <h1 className="text-base font-black text-white">{activity.title}</h1>
        </div>
      </div>

      <div className="flex-1 px-5 py-6 space-y-5">
        {activity.description && (
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>{activity.description}</p>
        )}
        {activity.period && (
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>📅 {activity.period}</p>
        )}

        {activity.teams.length === 0 ? (
          <p className="text-sm text-center py-8" style={{ color: "var(--text-muted)" }}>لم تُحدَّد الفرق بعد</p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2">
              <StatBox label="مباريات لُعبت" value={stats.matchesPlayed} />
              <StatBox label="مجموع الأهداف" value={stats.totalGoals} />
              <StatBox label="معدل الأهداف/مباراة" value={stats.avgGoalsPerMatch} />
              <StatBox label="أفضل هجوم" value={stats.bestAttack ? `${stats.bestAttack.name} (${stats.bestAttack.gf})` : "—"} />
            </div>

            <div className="space-y-4">
              <h2 className="font-black text-base" style={{ color: "var(--text-main)" }}>🏆 الترتيب</h2>
              {standingsByGroup.map((group) => (
                <div key={group.groupId ?? "none"} className="card overflow-x-auto">
                  {!singleFlatTable && (
                    <p className="text-sm font-bold px-3 pt-3" style={{ color: "var(--text-main)" }}>
                      {group.groupId ? groupNameById.get(group.groupId) || "مجموعة" : "بدون مجموعة"}
                    </p>
                  )}
                  <table className="w-full text-sm" style={{ minWidth: "440px" }}>
                    <thead>
                      <tr style={{ background: "var(--mint-100)" }}>
                        {["#", "الفريق", "لعب", "فاز", "تعادل", "خسر", "له", "عليه", "الفرق", "نقاط"].map((h) => (
                          <th key={h} className="px-2 py-2 text-center font-bold" style={{ color: "var(--mint-700)" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {group.standings.map((r, i) => (
                        <tr key={r.teamId} style={{ borderTop: "1px solid var(--mint-100)" }}>
                          <td className="px-2 py-2 text-center">{i + 1}</td>
                          <td className="px-2 py-2 text-center font-bold" style={{ color: "var(--text-main)" }}>{r.name}</td>
                          <td className="px-2 py-2 text-center">{r.played}</td>
                          <td className="px-2 py-2 text-center">{r.won}</td>
                          <td className="px-2 py-2 text-center">{r.drawn}</td>
                          <td className="px-2 py-2 text-center">{r.lost}</td>
                          <td className="px-2 py-2 text-center">{r.gf}</td>
                          <td className="px-2 py-2 text-center">{r.ga}</td>
                          <td className="px-2 py-2 text-center">{r.gd}</td>
                          <td className="px-2 py-2 text-center font-black" style={{ color: "var(--mint-700)" }}>{r.points}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>

            {played.length > 0 && (
              <div className="space-y-3">
                <h2 className="font-black text-base" style={{ color: "var(--text-main)" }}>✅ النتائج</h2>
                {played.map((m) => (
                  <div key={m.id} className="card p-4">
                    <p className="font-bold text-sm" style={{ color: "var(--text-main)" }}>
                      {m.homeTeam.name} {m.homeScore} - {m.awayScore} {m.awayTeam.name}
                      {m.homePenalties !== null && m.awayPenalties !== null && (
                        <span className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>
                          {" "}(ركلات ترجيح {m.homePenalties}-{m.awayPenalties})
                        </span>
                      )}
                    </p>
                    <div className="flex items-center gap-2 text-xs mt-1 flex-wrap" style={{ color: "var(--text-muted)" }}>
                      {m.round && <span>{m.round}</span>}
                      {m.venue && <span>📍 {m.venue}</span>}
                      {m.matchDate && <span dir="ltr">{new Date(m.matchDate).toLocaleDateString("ar")}</span>}
                    </div>
                    {m.goals.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {m.goals.map((g, i) => (
                          <span key={i} className="badge badge-active">⚽ {g.member.fullName} ({g.count})</span>
                        ))}
                      </div>
                    )}
                    {m.bookings.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {m.bookings.map((b, i) => (
                          <span key={i} className="badge badge-rejected">
                            {CARD_LABEL[b.cardType]} {b.member.fullName}{b.minute ? ` (${b.minute}')` : ""}
                          </span>
                        ))}
                      </div>
                    )}
                    {m.manOfTheMatch && (
                      <p className="text-xs mt-1.5 font-semibold" style={{ color: "var(--mint-700)" }}>
                        🌟 رجل المباراة: {m.manOfTheMatch.fullName}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {scheduled.length > 0 && (
              <div className="space-y-2">
                <h2 className="font-black text-base" style={{ color: "var(--text-main)" }}>📅 مباريات قادمة</h2>
                {scheduled.map((m) => (
                  <div key={m.id} className="card p-3">
                    <p className="font-bold text-sm" style={{ color: "var(--text-main)" }}>{m.homeTeam.name} × {m.awayTeam.name}</p>
                    <div className="flex items-center gap-2 text-xs mt-1 flex-wrap" style={{ color: "var(--text-muted)" }}>
                      {m.round && <span>{m.round}</span>}
                      {m.venue && <span>📍 {m.venue}</span>}
                      {m.matchDate && <span dir="ltr">{new Date(m.matchDate).toLocaleDateString("ar")}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {topScorers.length > 0 && (
              <div className="space-y-2">
                <h2 className="font-black text-base" style={{ color: "var(--text-main)" }}>⚽ الهدافون</h2>
                {topScorers.slice(0, 15).map((s, i) => (
                  <div key={s.memberId} className="card p-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span
                        className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shrink-0"
                        style={{ background: i === 0 ? "#fde68a" : "var(--mint-100)", color: i === 0 ? "#92400e" : "var(--mint-700)" }}
                      >
                        {i + 1}
                      </span>
                      <div>
                        <p className="font-bold text-sm" style={{ color: "var(--text-main)" }}>{s.fullName}</p>
                        <p className="text-xs" style={{ color: "var(--text-muted)" }}>{s.teamName}</p>
                      </div>
                    </div>
                    <span className="font-black" style={{ color: "var(--mint-700)" }}>⚽ {s.goals}</span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="card p-3 text-center">
      <p className="text-lg font-black" style={{ color: "var(--mint-700)" }}>{value}</p>
      <p className="text-xs" style={{ color: "var(--text-muted)" }}>{label}</p>
    </div>
  );
}
