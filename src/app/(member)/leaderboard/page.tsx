import Link from "next/link";
import { getLeaderboardData } from "@/lib/donationsServer";
import { getUserSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import PageHeader from "@/components/PageHeader";
import Icon from "@/components/Icon";
import PlayerAvatar from "@/components/tournament/PlayerAvatar";
import { countedLabel } from "@/lib/arabicPlural";
import IconLabel from "@/components/IconLabel";

export const dynamic = "force-dynamic";

const MEDALS = ["#d4af37", "#9aa3ab", "#c07a3e"];

// A tab of its own, so there is no back button and nothing to guess about
// where the reader came from.
async function getViewer() {
  const session = await getUserSession();
  if (!session) return null;
  const { userId } = session as { userId: string };
  const members = await prisma.member.findMany({
    where: { userId },
    select: { id: true, status: true },
    orderBy: { createdAt: "asc" },
  });
  const active = members.find((m) => m.status === "ACTIVE");
  return {
    memberIds: members.map((m) => m.id),
    donateHref: active ? `/donate?memberId=${active.id}` : "/donate",
  };
}

export default async function LeaderboardPage() {
  const { leaderboard } = await getLeaderboardData();
  const viewer = await getViewer();
  const donateHref = viewer?.donateHref ?? "/donate";

  // Your own standing, lifted out of a list that can run long. Giving under
  // your name and giving without it are two different rows on the board, and
  // both are yours, so both are shown here. Nobody else can tell they belong
  // to the same person; only the account looking at it can.
  const mine = viewer
    ? leaderboard.filter((e) => e.memberIds.some((id) => viewer.memberIds.includes(id)))
    : [];
  // Ranks are unique, so they identify a row without carrying the account down
  // into the table. Only the person looking sees their own rows marked.
  const mineRanks = new Set(mine.map((e) => e.rank));

  return (
    <div className="app-shell">
      <PageHeader title="لوحة شرف المتبرعين" />

      <div className="px-5 py-6 pb-10 space-y-5">
        {mine.length > 0 && (
          <div
            className="card p-4 fade-up space-y-3"
            style={{ background: "var(--mint-50)", border: "1.5px solid var(--mint-300)" }}
          >
            <p className="text-sm font-bold" style={{ color: "var(--text-main)" }}>
              {countedLabel(
                mine.length,
                "مركزك بين الداعمين",
                "مركزاك بين الداعمين",
                "مراكزك بين الداعمين",
              )}
            </p>

            {mine.map((entry) => (
              <div key={entry.rank} className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <span
                    className="w-11 h-11 rounded-full flex items-center justify-center shrink-0 font-black"
                    style={{ background: "var(--mint-600)", color: "#fff" }}
                  >
                    <span className="badge-numeral">{entry.rank}</span>
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-bold truncate" style={{ color: "var(--text-main)" }}>
                      {entry.name}
                    </p>
                    <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                      {entry.anonymous ? "تبرعاتك دون اسم" : "تبرعاتك باسمك"}
                    </p>
                  </div>
                </div>
                <span className="font-black shrink-0" style={{ color: "var(--mint-700)" }}>
                  {entry.total} أوقية
                </span>
              </div>
            ))}
          </div>
        )}

        <Link href={donateHref} className="btn btn-primary fade-up">
          <IconLabel name="heart" filled>
            ادعم الرابطة الآن
          </IconLabel>
        </Link>

        {leaderboard.length === 0 ? (
          <div className="card p-8 text-center fade-up">
            <div className="mb-3 flex justify-center">
              <Icon name="heart" size={40} color="var(--mint-400)" />
            </div>
            <p className="font-semibold" style={{ color: "var(--text-main)" }}>
              لا يوجد متبرعون بعد
            </p>
            <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
              كن أول داعم للرابطة!
            </p>
          </div>
        ) : (
          <div className="card overflow-x-auto fade-up">
            <table className="w-full text-sm" style={{ minWidth: "320px" }}>
              <thead>
                <tr style={{ background: "var(--mint-100)" }}>
                  <th
                    className="px-3 py-2.5 text-center font-bold"
                    style={{ color: "var(--mint-700)" }}
                  >
                    #
                  </th>
                  <th
                    className="px-3 py-2.5 text-right font-bold"
                    style={{ color: "var(--mint-700)" }}
                  >
                    الداعم
                  </th>
                  <th
                    className="px-3 py-2.5 text-center font-bold"
                    style={{ color: "var(--mint-700)" }}
                  >
                    المجموع
                  </th>
                </tr>
              </thead>
              <tbody>
                {leaderboard.map((entry) => (
                  <tr
                    key={entry.rank}
                    style={{
                      borderTop: "1px solid var(--mint-100)",
                      background: mineRanks.has(entry.rank) ? "var(--mint-50)" : undefined,
                      boxShadow: mineRanks.has(entry.rank)
                        ? "inset 3px 0 0 0 var(--mint-600)"
                        : undefined,
                    }}
                  >
                    <td className="px-3 py-2.5 text-center font-bold">
                      {entry.rank <= 3 ? (
                        <span
                          className="inline-flex"
                          role="img"
                          aria-label={`المركز ${entry.rank}`}
                        >
                          <Icon name="medal" size={20} color={MEDALS[entry.rank - 1]} />
                        </span>
                      ) : (
                        entry.rank
                      )}
                    </td>
                    <td className="px-3 py-2.5 font-bold" style={{ color: "var(--text-main)" }}>
                      <span className="flex items-center gap-2 justify-start">
                        <PlayerAvatar photoUrl={entry.photoUrl} fullName={entry.name} />
                        {entry.name}
                      </span>
                    </td>
                    <td
                      className="px-3 py-2.5 text-center font-black"
                      style={{ color: "var(--mint-700)" }}
                    >
                      {entry.total} أوقية
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
