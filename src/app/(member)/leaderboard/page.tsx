import Link from "next/link";
import { getLeaderboardData, toPublicEntry, SUPPORTERS_PAGE_SIZE } from "@/lib/donationsServer";
import { getUserSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { currentMembership } from "@/lib/currentMembershipServer";
import PageHeader from "@/components/PageHeader";
import Icon from "@/components/Icon";
import SupportersTable from "@/components/SupportersTable";
import IconLabel from "@/components/IconLabel";
import { supporters } from "@/lib/texts";

export const dynamic = "force-dynamic";

async function getViewer() {
  const session = await getUserSession();
  if (!session) return null;
  const { userId } = session as { userId: string };
  const current = await currentMembership(prisma, userId);
  return {
    userId,
    donateHref: current?.status === "ACTIVE" ? `/donate?memberId=${userId}` : "/donate",
  };
}

export default async function LeaderboardPage() {
  const { leaderboard } = await getLeaderboardData();
  const viewer = await getViewer();
  const donateHref = viewer?.donateHref ?? "/donate";

  const mine = viewer ? leaderboard.filter((e) => e.accountIds.includes(viewer.userId)) : [];

  return (
    <div className="app-shell">
      <PageHeader title={supporters.title} />

      <div className="px-5 py-6 pb-10 space-y-5">
        {mine.length > 0 && (
          <div
            className="card p-4 fade-up space-y-3"
            style={{ background: "var(--mint-50)", border: "1.5px solid var(--mint-300)" }}
          >
            <p className="text-sm font-bold" style={{ color: "var(--text-main)" }}>
              {supporters.yourPlaces(mine.length)}
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
                      {entry.anonymous ? supporters.unnamedGiving : supporters.namedGiving}
                    </p>
                  </div>
                </div>
                <span className="font-black shrink-0" style={{ color: "var(--mint-700)" }}>
                  {supporters.amount(entry.total)}
                </span>
              </div>
            ))}
          </div>
        )}

        <Link href={donateHref} className="btn btn-primary fade-up">
          <IconLabel name="heart" filled>
            {supporters.donate}
          </IconLabel>
        </Link>

        {leaderboard.length === 0 ? (
          <div className="card p-8 text-center fade-up">
            <div className="mb-3 flex justify-center">
              <Icon name="heart" size={40} color="var(--mint-400)" />
            </div>
            <p className="font-semibold" style={{ color: "var(--text-main)" }}>
              {supporters.emptyTitle}
            </p>
            <p className="text-sm mt-1" style={{ color: "var(--text-muted)" }}>
              {supporters.emptyHint}
            </p>
          </div>
        ) : (
          <SupportersTable
            initial={leaderboard.slice(0, SUPPORTERS_PAGE_SIZE).map(toPublicEntry)}
            total={leaderboard.length}
            mineRanks={mine.map((e) => e.rank)}
          />
        )}
      </div>
    </div>
  );
}
