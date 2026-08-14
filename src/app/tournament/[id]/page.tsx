import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getUserSession } from "@/lib/auth";
import {
  groupStandings,
  computeTopScorers,
  computeStats,
  computeDisciplineStats,
  computeCleanSheets,
  computeMotmLeaders,
  computeTeamAdvancedStats,
  getHeadToHead,
  formatMatchDateTime,
  matchDateKey,
  todayClubDateKey,
} from "@/lib/tournament";
import FollowTeamButton from "@/components/tournament/FollowTeamButton";
import ShareResultButton from "@/components/tournament/ShareResultButton";
import MvpVoteWidget from "@/components/tournament/MvpVoteWidget";
import PlayerAvatar from "@/components/tournament/PlayerAvatar";
import TeamLogo from "@/components/tournament/TeamLogo";
import BracketTree from "@/components/tournament/BracketTree";
import StatsToggle from "@/components/tournament/StatsToggle";
import PageHeader from "@/components/PageHeader";

export const dynamic = "force-dynamic";

const CARD_LABEL: Record<string, string> = { YELLOW: "🟨", RED: "🟥" };
const FORM_STYLE: Record<"W" | "D" | "L", { bg: string; color: string }> = {
  W: { bg: "#d1fae5", color: "#065f46" },
  D: { bg: "var(--mint-100)", color: "var(--text-muted)" },
  L: { bg: "#fee2e2", color: "#991b1b" },
};

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
      teams: {
        select: {
          id: true,
          name: true,
          logo: true,
          groupId: true,
          members: {
            select: { member: { select: { id: true, fullName: true, photo: true } } },
            orderBy: { member: { fullName: "asc" } },
          },
        },
      },
      matches: {
        orderBy: [{ status: "asc" }, { order: "asc" }, { matchDate: "asc" }, { createdAt: "asc" }],
        select: {
          id: true,
          homeTeam: { select: { id: true, name: true, logo: true } },
          awayTeam: { select: { id: true, name: true, logo: true } },
          matchDate: true,
          round: true,
          venue: true,
          isKnockout: true,
          bracketRound: true,
          order: true,
          homeScore: true,
          awayScore: true,
          homePenalties: true,
          awayPenalties: true,
          status: true,
          manOfTheMatch: { select: { id: true, fullName: true, photo: true } },
          goals: {
            select: {
              count: true,
              minute: true,
              teamId: true,
              member: { select: { id: true, fullName: true, photo: true } },
            },
          },
          bookings: {
            select: {
              cardType: true,
              minute: true,
              teamId: true,
              member: { select: { id: true, fullName: true, photo: true } },
            },
          },
          mvpVote: {
            select: {
              id: true,
              status: true,
              candidates: {
                select: {
                  id: true,
                  member: { select: { id: true, fullName: true } },
                  _count: { select: { votes: true } },
                },
              },
            },
          },
        },
      },
    },
  });

  if (!activity || !activity.isTournament) {
    notFound();
  }

  const session = await getUserSession();
  const userId = session ? (session as { userId: string }).userId : null;
  const voteIds = activity.matches.map((m) => m.mvpVote?.id).filter((v): v is string => !!v);
  const myVotes =
    userId && voteIds.length > 0
      ? await prisma.mvpVote.findMany({
          where: { userId, voteId: { in: voteIds } },
          select: { voteId: true, candidateId: true },
        })
      : [];
  const myVoteByVoteId = new Map(myVotes.map((v) => [v.voteId, v.candidateId]));

  const standingsByGroup = groupStandings(activity.teams, activity.matches);
  const topScorers = computeTopScorers(activity.teams, activity.matches);
  const stats = computeStats(activity.teams, activity.matches);
  const discipline = computeDisciplineStats(activity.teams, activity.matches);
  const cleanSheets = computeCleanSheets(activity.teams, activity.matches);
  const motmLeaders = computeMotmLeaders(activity.teams, activity.matches);
  const teamAdvancedStats = computeTeamAdvancedStats(activity.teams, activity.matches).filter(
    (t) => t.biggestWin || t.form.length > 0,
  );
  const groupNameById = new Map(activity.groups.map((g) => [g.id, g.name]));
  const singleFlatTable = standingsByGroup.length === 1 && standingsByGroup[0].groupId === null;

  const played = activity.matches.filter((m) => m.status === "PLAYED");
  const scheduled = activity.matches.filter((m) => m.status === "SCHEDULED");
  const bracketMatches = activity.matches.filter(
    (m): m is typeof m & { bracketRound: number } => m.bracketRound !== null,
  );
  const todayKey = todayClubDateKey();
  const todayMatches = activity.matches
    .filter((m) => m.matchDate && matchDateKey(m.matchDate) === todayKey)
    .sort((a, b) => new Date(a.matchDate!).getTime() - new Date(b.matchDate!).getTime());

  return (
    <div className="app-shell">
      <PageHeader title={activity.title} backHref="/" />

      <div className="flex-1 px-5 py-6 space-y-5">
        {activity.description && (
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            {activity.description}
          </p>
        )}
        {activity.period && (
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            📅 {activity.period}
          </p>
        )}

        {activity.teams.length === 0 ? (
          <p className="text-sm text-center py-8" style={{ color: "var(--text-muted)" }}>
            لم تُحدَّد الفرق بعد
          </p>
        ) : (
          <>
            {todayMatches.length > 0 && (
              <div className="space-y-2">
                <h2 className="font-black text-base" style={{ color: "var(--text-main)" }}>
                  ⚡ مباريات اليوم
                </h2>
                {todayMatches.map((m) => (
                  <div
                    key={m.id}
                    className="card p-4"
                    style={{
                      background: "linear-gradient(135deg, var(--mint-700), var(--mint-600))",
                    }}
                  >
                    <div className="flex items-center justify-between gap-2" dir="rtl">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <TeamLogo logo={m.homeTeam.logo} name={m.homeTeam.name} size={28} />
                        <span className="font-bold text-sm text-white truncate">
                          {m.homeTeam.name}
                        </span>
                      </div>
                      <span className="font-black text-white text-lg shrink-0 px-2">
                        {m.status === "PLAYED" ? `${m.homeScore} - ${m.awayScore}` : "×"}
                      </span>
                      <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
                        <span className="font-bold text-sm text-white truncate">
                          {m.awayTeam.name}
                        </span>
                        <TeamLogo logo={m.awayTeam.logo} name={m.awayTeam.name} size={28} />
                      </div>
                    </div>
                    <div
                      className="flex items-center gap-2 text-xs mt-2 flex-wrap"
                      style={{ color: "rgba(255,255,255,0.85)" }}
                    >
                      {m.round && <span>{m.round}</span>}
                      {m.venue && <span>📍 {m.venue}</span>}
                      {m.matchDate && <span dir="ltr">{formatMatchDateTime(m.matchDate)}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <StatsToggle
              matchesPlayed={stats.matchesPlayed}
              totalGoals={stats.totalGoals}
              avgGoalsPerMatch={stats.avgGoalsPerMatch}
              bestAttack={
                stats.bestAttack ? `${stats.bestAttack.name} (${stats.bestAttack.gf})` : "—"
              }
            />

            <div className="space-y-2">
              <h2 className="font-black text-base" style={{ color: "var(--text-main)" }}>
                🧍 الفرق واللاعبون
              </h2>
              <div className="grid grid-cols-2 items-start gap-2">
                {activity.teams.map((team) => (
                  <details key={team.id} className="card p-3">
                    <summary
                      className="font-bold text-sm cursor-pointer flex items-center gap-1.5"
                      style={{ color: "var(--text-main)" }}
                    >
                      <TeamLogo logo={team.logo} name={team.name} size={20} />
                      {team.name}{" "}
                      <span style={{ color: "var(--text-muted)", fontWeight: 400 }}>
                        ({team.members.length})
                      </span>
                    </summary>
                    {team.members.length === 0 ? (
                      <p className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>
                        لا يوجد لاعبون بعد
                      </p>
                    ) : (
                      <ul className="mt-2 space-y-1.5">
                        {team.members.map(({ member }) => (
                          <li
                            key={member.id}
                            className="flex items-center gap-2 text-xs"
                            style={{ color: "var(--text-muted)" }}
                          >
                            <PlayerAvatar
                              photo={member.photo}
                              fullName={member.fullName}
                              size={22}
                            />
                            {member.fullName}
                          </li>
                        ))}
                      </ul>
                    )}
                  </details>
                ))}
              </div>
            </div>

            {bracketMatches.length > 0 && (
              <div className="space-y-2">
                <h2 className="font-black text-base" style={{ color: "var(--text-main)" }}>
                  🏆 الدور الإقصائي
                </h2>
                <div className="card p-3">
                  <BracketTree
                    matches={bracketMatches.map((m) => ({
                      ...m,
                      status: m.status as "SCHEDULED" | "PLAYED",
                    }))}
                  />
                </div>
              </div>
            )}

            <div className="space-y-4">
              <h2 className="font-black text-base" style={{ color: "var(--text-main)" }}>
                🏆 الترتيب
              </h2>
              {standingsByGroup.map((group) => (
                <div key={group.groupId ?? "none"} className="card overflow-x-auto">
                  {!singleFlatTable && (
                    <p
                      className="text-sm font-bold px-3 pt-3"
                      style={{ color: "var(--text-main)" }}
                    >
                      {group.groupId ? groupNameById.get(group.groupId) || "مجموعة" : "بدون مجموعة"}
                    </p>
                  )}
                  <table className="w-full text-sm" style={{ minWidth: "440px" }}>
                    <thead>
                      <tr style={{ background: "var(--mint-100)" }}>
                        {[
                          "#",
                          "الفريق",
                          "نقاط",
                          "لعب",
                          "فاز",
                          "تعادل",
                          "خسر",
                          "له",
                          "عليه",
                          "الفرق",
                          "",
                        ].map((h) => (
                          <th
                            key={h}
                            className="px-2 py-2 text-center font-bold"
                            style={{ color: "var(--mint-700)" }}
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {group.standings.map((r, i) => (
                        <tr key={r.teamId} style={{ borderTop: "1px solid var(--mint-100)" }}>
                          <td className="px-2 py-2 text-center">{i + 1}</td>
                          <td className="px-2 py-2 font-bold" style={{ color: "var(--text-main)" }}>
                            <span className="flex items-center gap-1.5 justify-center">
                              <TeamLogo logo={r.logo} name={r.name} size={18} />
                              {r.name}
                            </span>
                          </td>
                          <td
                            className="px-2 py-2 text-center font-black"
                            style={{ color: "var(--mint-700)" }}
                          >
                            {r.points}
                          </td>
                          <td className="px-2 py-2 text-center">{r.played}</td>
                          <td className="px-2 py-2 text-center">{r.won}</td>
                          <td className="px-2 py-2 text-center">{r.drawn}</td>
                          <td className="px-2 py-2 text-center">{r.lost}</td>
                          <td className="px-2 py-2 text-center">{r.gf}</td>
                          <td className="px-2 py-2 text-center">{r.ga}</td>
                          <td className="px-2 py-2 text-center">{r.gd}</td>
                          <td className="px-2 py-2 text-center">
                            <FollowTeamButton teamId={r.teamId} />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>

            {played.length > 0 && (
              <div className="space-y-3">
                <h2 className="font-black text-base" style={{ color: "var(--text-main)" }}>
                  ✅ النتائج
                </h2>
                {played.map((m) => {
                  const priorMeetings = getHeadToHead(
                    activity.matches,
                    m.homeTeam.id,
                    m.awayTeam.id,
                    m.id,
                  );
                  return (
                    <div key={m.id} className="card p-4">
                      <div className="flex items-start justify-between gap-2">
                        <p
                          className="font-bold text-sm flex items-center gap-1.5 flex-wrap"
                          style={{ color: "var(--text-main)" }}
                        >
                          <TeamLogo logo={m.homeTeam.logo} name={m.homeTeam.name} size={20} />
                          {m.homeTeam.name} {m.homeScore} - {m.awayScore} {m.awayTeam.name}
                          <TeamLogo logo={m.awayTeam.logo} name={m.awayTeam.name} size={20} />
                          {m.homePenalties !== null && m.awayPenalties !== null && (
                            <span
                              className="text-xs font-semibold"
                              style={{ color: "var(--text-muted)" }}
                            >
                              {" "}
                              (ركلات ترجيح {m.homePenalties}-{m.awayPenalties})
                            </span>
                          )}
                        </p>
                        <ShareResultButton
                          homeTeamName={m.homeTeam.name}
                          awayTeamName={m.awayTeam.name}
                          homeTeamLogo={m.homeTeam.logo}
                          awayTeamLogo={m.awayTeam.logo}
                          homeScore={m.homeScore ?? 0}
                          awayScore={m.awayScore ?? 0}
                          round={m.round}
                          tournamentTitle={activity.title}
                          goals={m.goals.map((g) => ({
                            fullName: g.member.fullName,
                            photo: g.member.photo,
                            count: g.count,
                            minute: g.minute,
                            isHome: g.teamId === m.homeTeam.id,
                          }))}
                          bookings={m.bookings.map((b) => ({
                            fullName: b.member.fullName,
                            photo: b.member.photo,
                            cardType: b.cardType as "YELLOW" | "RED",
                            minute: b.minute,
                            isHome: b.teamId === m.homeTeam.id,
                          }))}
                        />
                      </div>
                      <div
                        className="flex items-center gap-2 text-xs mt-1 flex-wrap"
                        style={{ color: "var(--text-muted)" }}
                      >
                        {m.round && <span>{m.round}</span>}
                        {m.venue && <span>📍 {m.venue}</span>}
                        {m.matchDate && <span dir="ltr">{formatMatchDateTime(m.matchDate)}</span>}
                      </div>
                      {priorMeetings.length > 0 && (
                        <p className="text-xs mt-1.5" style={{ color: "var(--text-muted)" }}>
                          🔁 مواجهات سابقة:{" "}
                          {priorMeetings
                            .map((pm) =>
                              pm.status === "PLAYED" ? `${pm.homeScore}-${pm.awayScore}` : "قادمة",
                            )
                            .join("، ")}
                        </p>
                      )}
                      {m.goals.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {m.goals.map((g, i) => (
                            <span
                              key={i}
                              className="flex items-center gap-1.5 pl-2 pr-1 py-1 rounded-full text-xs font-bold"
                              style={{ background: "#d1fae5", color: "#065f46" }}
                            >
                              <PlayerAvatar
                                photo={g.member.photo}
                                fullName={g.member.fullName}
                                size={18}
                              />
                              ⚽ {g.member.fullName}
                              {g.minute ? ` ${g.minute}'` : ""}
                              {g.count > 1 ? ` (${g.count})` : ""}
                            </span>
                          ))}
                        </div>
                      )}
                      {m.bookings.length > 0 && (
                        <div className="mt-1.5 flex flex-wrap gap-2">
                          {m.bookings.map((b, i) => (
                            <span
                              key={i}
                              className="flex items-center gap-1.5 pl-2 pr-1 py-1 rounded-full text-xs font-bold"
                              style={{ background: "#fee2e2", color: "#991b1b" }}
                            >
                              <PlayerAvatar
                                photo={b.member.photo}
                                fullName={b.member.fullName}
                                size={18}
                              />
                              {CARD_LABEL[b.cardType]} {b.member.fullName}
                              {b.minute ? ` (${b.minute}')` : ""}
                            </span>
                          ))}
                        </div>
                      )}
                      {m.manOfTheMatch && (
                        <p
                          className="text-xs mt-1.5 font-semibold flex items-center gap-1.5"
                          style={{ color: "var(--mint-700)" }}
                        >
                          <PlayerAvatar
                            photo={m.manOfTheMatch.photo}
                            fullName={m.manOfTheMatch.fullName}
                            size={20}
                          />
                          🌟 رجل المباراة: {m.manOfTheMatch.fullName}
                        </p>
                      )}
                      {m.mvpVote && (
                        <MvpVoteWidget
                          matchId={m.id}
                          status={m.mvpVote.status as "OPEN" | "CLOSED"}
                          candidates={m.mvpVote.candidates.map((c) => ({
                            id: c.id,
                            fullName: c.member.fullName,
                            voteCount: c._count.votes,
                          }))}
                          loggedIn={!!userId}
                          initialMyVoteCandidateId={myVoteByVoteId.get(m.mvpVote.id) || null}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {scheduled.length > 0 && (
              <div className="space-y-2">
                <h2 className="font-black text-base" style={{ color: "var(--text-main)" }}>
                  📅 مباريات قادمة
                </h2>
                {scheduled.map((m) => (
                  <div key={m.id} className="card p-3">
                    <p
                      className="font-bold text-sm flex items-center gap-1.5"
                      style={{ color: "var(--text-main)" }}
                    >
                      <TeamLogo logo={m.homeTeam.logo} name={m.homeTeam.name} size={18} />
                      {m.homeTeam.name} × {m.awayTeam.name}
                      <TeamLogo logo={m.awayTeam.logo} name={m.awayTeam.name} size={18} />
                    </p>
                    <div
                      className="flex items-center gap-2 text-xs mt-1 flex-wrap"
                      style={{ color: "var(--text-muted)" }}
                    >
                      {m.round && <span>{m.round}</span>}
                      {m.venue && <span>📍 {m.venue}</span>}
                      {m.matchDate && <span dir="ltr">{formatMatchDateTime(m.matchDate)}</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {topScorers.length > 0 && (
              <div className="space-y-2">
                <h2 className="font-black text-base" style={{ color: "var(--text-main)" }}>
                  ⚽ الهدافون
                </h2>
                {topScorers.slice(0, 15).map((s, i) => (
                  <div
                    key={s.memberId}
                    className="card p-3 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shrink-0"
                        style={{
                          background: i === 0 ? "#fde68a" : "var(--mint-100)",
                          color: i === 0 ? "#92400e" : "var(--mint-700)",
                        }}
                      >
                        {i + 1}
                      </span>
                      <PlayerAvatar photo={s.photo} fullName={s.fullName} size={32} />
                      <div>
                        <p className="font-bold text-sm" style={{ color: "var(--text-main)" }}>
                          {s.fullName}
                        </p>
                        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                          {s.teamName}
                        </p>
                      </div>
                    </div>
                    <span className="font-black" style={{ color: "var(--mint-700)" }}>
                      ⚽ {s.goals}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {discipline.length > 0 && (
              <div className="space-y-2">
                <h2 className="font-black text-base" style={{ color: "var(--text-main)" }}>
                  🟨🟥 الانضباط
                </h2>
                {discipline.slice(0, 15).map((d, i) => (
                  <div
                    key={d.memberId}
                    className="card p-3 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shrink-0"
                        style={{
                          background: i === 0 ? "#fde68a" : "var(--mint-100)",
                          color: i === 0 ? "#92400e" : "var(--mint-700)",
                        }}
                      >
                        {i + 1}
                      </span>
                      <PlayerAvatar photo={d.photo} fullName={d.fullName} size={32} />
                      <div>
                        <p className="font-bold text-sm" style={{ color: "var(--text-main)" }}>
                          {d.fullName}
                        </p>
                        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                          {d.teamName}
                        </p>
                      </div>
                    </div>
                    <span className="font-black text-sm" style={{ color: "var(--text-main)" }}>
                      {d.yellow > 0 && `🟨${d.yellow}`} {d.red > 0 && `🟥${d.red}`}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {cleanSheets.length > 0 && (
              <div className="space-y-2">
                <h2 className="font-black text-base" style={{ color: "var(--text-main)" }}>
                  🧤 أفضل دفاع
                </h2>
                {cleanSheets.slice(0, 10).map((c, i) => (
                  <div key={c.teamId} className="card p-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <span
                        className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shrink-0"
                        style={{
                          background: i === 0 ? "#fde68a" : "var(--mint-100)",
                          color: i === 0 ? "#92400e" : "var(--mint-700)",
                        }}
                      >
                        {i + 1}
                      </span>
                      <p className="font-bold text-sm" style={{ color: "var(--text-main)" }}>
                        {c.name}
                      </p>
                    </div>
                    <span className="font-black" style={{ color: "var(--mint-700)" }}>
                      🧤 {c.cleanSheets}/{c.played}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {motmLeaders.length > 0 && (
              <div className="space-y-2">
                <h2 className="font-black text-base" style={{ color: "var(--text-main)" }}>
                  🌟 رجل المباراة
                </h2>
                {motmLeaders.slice(0, 10).map((m, i) => (
                  <div
                    key={m.memberId}
                    className="card p-3 flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black shrink-0"
                        style={{
                          background: i === 0 ? "#fde68a" : "var(--mint-100)",
                          color: i === 0 ? "#92400e" : "var(--mint-700)",
                        }}
                      >
                        {i + 1}
                      </span>
                      <PlayerAvatar photo={m.photo} fullName={m.fullName} size={32} />
                      <div>
                        <p className="font-bold text-sm" style={{ color: "var(--text-main)" }}>
                          {m.fullName}
                        </p>
                        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                          {m.teamName}
                        </p>
                      </div>
                    </div>
                    <span className="font-black" style={{ color: "var(--mint-700)" }}>
                      🌟 {m.count}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {teamAdvancedStats.length > 0 && (
              <div className="space-y-2">
                <h2 className="font-black text-base" style={{ color: "var(--text-main)" }}>
                  📊 إحصائيات الفرق
                </h2>
                {teamAdvancedStats.map((t) => (
                  <div key={t.teamId} className="card p-3 space-y-1">
                    <p className="font-bold text-sm" style={{ color: "var(--text-main)" }}>
                      {t.name}
                    </p>
                    {t.biggestWin && (
                      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                        🔥 أكبر فوز: {t.biggestWin.score} أمام {t.biggestWin.opponent}
                      </p>
                    )}
                    {t.unbeatenStreak > 0 && (
                      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                        🛡️ سلسلة بدون هزيمة: {t.unbeatenStreak}
                      </p>
                    )}
                    {t.form.length > 0 && (
                      <div className="flex items-center gap-1 mt-1">
                        <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                          آخر {t.form.length} مباريات:
                        </span>
                        {t.form.map((f, i) => (
                          <span
                            key={i}
                            className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black"
                            style={{ background: FORM_STYLE[f].bg, color: FORM_STYLE[f].color }}
                          >
                            {f}
                          </span>
                        ))}
                      </div>
                    )}
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
