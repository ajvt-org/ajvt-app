"use client";

import { useState } from "react";
import Icon from "@/components/Icon";
import IconLabel from "@/components/IconLabel";
import PlayerAvatar from "@/components/tournament/PlayerAvatar";
import type { PublicLeaderboardEntry } from "@/lib/donationsServer";
import { supporters } from "@/lib/texts";

const MEDALS = ["#d4af37", "#9aa3ab", "#c07a3e"];

export default function SupportersTable({
  initial,
  total,
  mineRanks,
}: {
  initial: PublicLeaderboardEntry[];
  total: number;
  mineRanks: number[];
}) {
  const [rows, setRows] = useState(initial);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const mine = new Set(mineRanks);

  async function loadMore() {
    setLoading(true);
    setFailed(false);
    try {
      const res = await fetch(`/api/leaderboard?offset=${rows.length}`);
      if (!res.ok) throw new Error();
      const data = (await res.json()) as { rows: PublicLeaderboardEntry[] };
      setRows((prev) => [...prev, ...data.rows]);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <div className="card overflow-x-auto fade-up">
        <table className="w-full text-sm" style={{ minWidth: "320px" }}>
          <thead>
            <tr style={{ background: "var(--mint-100)" }}>
              <th
                className="px-3 py-2.5 text-center font-bold"
                style={{ color: "var(--mint-700)" }}
              >
                {supporters.placeColumn}
              </th>
              <th className="px-3 py-2.5 text-right font-bold" style={{ color: "var(--mint-700)" }}>
                {supporters.supporterColumn}
              </th>
              <th
                className="px-3 py-2.5 text-center font-bold"
                style={{ color: "var(--mint-700)" }}
              >
                {supporters.totalColumn}
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((entry) => (
              <tr
                key={entry.rank}
                className={mine.has(entry.rank) ? "row-mine" : undefined}
                style={{ borderTop: "1px solid var(--mint-100)" }}
              >
                <td className="px-3 py-2.5 text-center font-bold">
                  {entry.rank <= 3 ? (
                    <span
                      className="inline-flex"
                      role="img"
                      aria-label={supporters.place(entry.rank)}
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
                  {supporters.amount(entry.total)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {rows.length < total && (
        <button
          onClick={loadMore}
          disabled={loading}
          className="btn"
          style={{ background: "var(--mint-100)", color: "var(--mint-700)" }}
        >
          {loading ? (
            supporters.loading
          ) : (
            <IconLabel name="chevronDown">{supporters.more}</IconLabel>
          )}
        </button>
      )}

      {failed && (
        <p className="text-xs text-center" style={{ color: "#dc2626" }}>
          <Icon name="warning" size={13} className="icon-inline" /> {supporters.loadFailed}
        </p>
      )}
    </>
  );
}
