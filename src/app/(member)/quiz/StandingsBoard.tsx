"use client";

import PlayerAvatar from "@/components/tournament/PlayerAvatar";
import NumericRanges from "@/components/NumericRanges";
import { countedNoun, POINTS } from "@/lib/arabicPlural";

export interface BoardRow {
  rank: number;
  userId: string;
  name: string;
  photoUrl: string | null;
  total: number;
}

export interface MyPlace {
  rank: number;
  total: number;
}

export default function StandingsBoard({
  title,
  rows,
  mine,
  meId,
  empty,
}: {
  title: string;
  rows: BoardRow[];
  mine: MyPlace | null;
  meId: string | null;
  empty: string;
}) {
  const listed = rows.some((r) => r.userId === meId);

  return (
    <section className="card p-4 space-y-2">
      <p className="text-sm font-bold" style={{ color: "var(--text-main)" }}>
        {title}
      </p>

      {rows.length === 0 ? (
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          {empty}
        </p>
      ) : (
        <ol className="space-y-1.5">
          {rows.map((row) => (
            <li
              key={row.userId}
              className="flex items-center gap-2.5 rounded-xl p-2"
              style={{
                background: row.userId === meId ? "var(--mint-100)" : "transparent",
              }}
            >
              <span
                className="text-xs font-black w-5 text-center shrink-0"
                style={{ color: "var(--mint-700)" }}
              >
                {row.rank}
              </span>
              <PlayerAvatar photo={null} fullName={row.name} size={26} />
              <span className="text-sm flex-1 truncate" style={{ color: "var(--text-main)" }}>
                {row.name}
              </span>
              <span className="text-sm font-bold" style={{ color: "var(--mint-700)" }}>
                <NumericRanges>{String(row.total)}</NumericRanges>
              </span>
            </li>
          ))}
        </ol>
      )}

      {mine && !listed && (
        <p
          className="text-xs font-bold rounded-xl p-2"
          style={{ background: "var(--mint-100)", color: "var(--mint-700)" }}
        >
          <NumericRanges>{`ترتيبك ${mine.rank} بمجموع ${countedNoun(mine.total, POINTS)}`}</NumericRanges>
        </p>
      )}
    </section>
  );
}
