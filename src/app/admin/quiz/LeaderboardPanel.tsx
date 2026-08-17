"use client";

import Icon from "@/components/Icon";
import IconLabel from "@/components/IconLabel";
import type { LeaderboardRow } from "./types";

function Rank({ rank }: { rank: number }) {
  const top3 = rank <= 3;
  return (
    <span
      className="inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-black"
      style={{
        background: top3
          ? "linear-gradient(160deg, var(--copper-400), var(--copper-600))"
          : "var(--mint-100)",
        color: top3 ? "#fff" : "var(--mint-700)",
      }}
    >
      {top3 ? <Icon name="medal" size={14} /> : rank}
    </span>
  );
}

export default function LeaderboardPanel({
  rows,
  open,
  onToggle,
}: {
  rows: LeaderboardRow[];
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <div className="card overflow-hidden">
      <button onClick={onToggle} className="w-full flex items-center justify-between px-4 py-3">
        <p className="text-sm font-bold" style={{ color: "var(--text-main)" }}>
          <IconLabel name="trophy">الترتيب الكامل ({rows.length})</IconLabel>
        </p>
        <Icon name={open ? "chevronDown" : "chevronLeft"} size={14} />
      </button>

      {open && (
        <div className="overflow-x-auto" style={{ borderTop: "1px solid var(--mint-100)" }}>
          <table className="w-full text-sm" style={{ minWidth: "360px" }}>
            <thead>
              <tr style={{ background: "var(--mint-100)" }}>
                {["#", "المستخدم", "النقاط"].map((header) => (
                  <th
                    key={header}
                    className="px-3 py-2 text-center font-bold"
                    style={{ color: "var(--mint-700)" }}
                  >
                    {header}
                  </th>
                ))}
                <th className="px-3 py-2 text-center" style={{ color: "var(--mint-700)" }}>
                  <span className="inline-flex justify-center w-full">
                    <Icon name="flame" size={14} />
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((entry) => (
                <tr key={entry.userId} style={{ borderTop: "1px solid var(--mint-100)" }}>
                  <td className="px-3 py-2 text-center">
                    <Rank rank={entry.rank} />
                  </td>
                  <td className="px-3 py-2 font-bold" style={{ color: "var(--text-main)" }}>
                    {entry.name}
                  </td>
                  <td
                    className="px-3 py-2 text-center font-black"
                    style={{ color: "var(--mint-700)" }}
                  >
                    {entry.total}
                  </td>
                  <td className="px-3 py-2 text-center" style={{ color: "var(--copper-600)" }}>
                    {entry.currentStreak}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
