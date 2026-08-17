"use client";

import Icon from "@/components/Icon";
import IconLabel from "@/components/IconLabel";
import type { LeaderboardEntry } from "./types";

function RankBadge({ rank }: { rank: number }) {
  const top3 = rank <= 3;
  return (
    <span
      className="inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-black"
      style={{
        background: top3
          ? "linear-gradient(160deg, var(--copper-400), var(--copper-600))"
          : "var(--mint-100)",
        color: top3 ? "#fff" : "var(--mint-700)",
      }}
    >
      {top3 ? <Icon name="medal" size={16} /> : rank}
    </span>
  );
}

function OwnRow({ rank, totalPoints }: { rank: number; totalPoints: number }) {
  return (
    <div
      className="px-4 py-3 flex items-center justify-between gap-2"
      style={{
        borderTop: "1.5px solid var(--mint-200)",
        background: "linear-gradient(135deg, var(--mint-100), var(--mint-50))",
      }}
    >
      <span className="flex items-center gap-2.5">
        <span
          className="inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-black text-white shrink-0"
          style={{ background: "linear-gradient(160deg, var(--mint-600), var(--mint-700))" }}
        >
          {rank}
        </span>
        <span className="text-sm font-bold" style={{ color: "var(--mint-700)" }}>
          أنت
        </span>
      </span>
      <span className="text-sm font-black" style={{ color: "var(--mint-700)" }}>
        {totalPoints} نقطة
      </span>
    </div>
  );
}

export default function QuizLeaderboard({
  entries,
  myRank,
  totalPoints,
}: {
  entries: LeaderboardEntry[];
  myRank: number;
  totalPoints: number;
}) {
  return (
    <div className="card overflow-x-auto fade-up delay-2">
      <div className="px-4 py-3" style={{ borderBottom: "1px solid var(--mint-100)" }}>
        <h2 className="font-black text-sm" style={{ color: "var(--mint-700)" }}>
          <IconLabel name="trophy">الأفضل في المسابقة الثقافية</IconLabel>
        </h2>
      </div>

      {entries.length === 0 ? (
        <p className="text-sm text-center py-6" style={{ color: "var(--text-muted)" }}>
          لا يوجد مشاركون بعد
        </p>
      ) : (
        <table className="w-full text-sm" style={{ minWidth: "320px" }}>
          <tbody>
            {entries.map((entry) => (
              <tr
                key={entry.userId}
                style={{
                  borderTop: "1px solid var(--mint-100)",
                  borderRight:
                    entry.rank === myRank ? "3px solid var(--mint-600)" : "3px solid transparent",
                  background: entry.rank === myRank ? "var(--mint-50)" : "transparent",
                }}
              >
                <td className="px-3 py-2.5 text-center" style={{ width: "18%" }}>
                  <RankBadge rank={entry.rank} />
                </td>
                <td className="px-3 py-2.5 font-bold" style={{ color: "var(--text-main)" }}>
                  {entry.name}
                </td>
                <td
                  className="px-3 py-2.5 text-center font-black"
                  style={{ color: "var(--mint-700)" }}
                >
                  {entry.total} نقطة
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {myRank > 10 && <OwnRow rank={myRank} totalPoints={totalPoints} />}
    </div>
  );
}
