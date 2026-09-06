"use client";

import PlayerAvatar from "@/components/tournament/PlayerAvatar";
import NumericRanges from "@/components/NumericRanges";
import { countedNoun, POINTS } from "@/lib/arabicPlural";
import { useNow } from "@/hooks/useNow";

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

function BlockTimer({ opensAt, closesAt }: { opensAt: string; closesAt: string }) {
  const now = useNow(60_000);
  const start = new Date(opensAt).getTime();
  const end = new Date(closesAt).getTime();
  const fill = Math.min(1, Math.max(0, (end - now) / Math.max(1, end - start)));
  const urgent = fill < 0.2;

  return (
    <div
      className="w-full rounded-full overflow-hidden"
      style={{ height: 4, background: "var(--mint-100)" }}
      role="progressbar"
      aria-valuenow={Math.round(fill * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full rounded-full"
        style={{
          width: `${Math.round(fill * 100)}%`,
          background: urgent
            ? "linear-gradient(90deg, var(--copper-500), var(--copper-600))"
            : "var(--mint-500)",
        }}
      />
    </div>
  );
}

export default function StandingsBoard({
  title,
  rows,
  mine,
  meId,
  empty,
  blockOpensAt,
  blockClosesAt,
  competitionState,
}: {
  title: string;
  rows: BoardRow[];
  mine: MyPlace | null;
  meId: string | null;
  empty: string;
  blockOpensAt?: string | null;
  blockClosesAt?: string | null;
  competitionState?: "before" | "open" | "closed" | "over" | null;
}) {
  const listed = rows.some((r) => r.userId === meId);
  const podium = rows.length >= 3 ? [rows[1], rows[0], rows[2]] : [];
  const rest = rows.length >= 3 ? rows.slice(3) : rows;

  return (
    <section className="card p-4 space-y-2">
      <p className="text-sm font-bold" style={{ color: "var(--text-main)" }}>
        {title}
      </p>

      {blockOpensAt &&
        blockClosesAt &&
        competitionState !== "before" &&
        competitionState !== "over" && (
          <BlockTimer opensAt={blockOpensAt} closesAt={blockClosesAt} />
        )}

      {podium.length === 3 && (
        <div className="flex items-end justify-center gap-3 pb-2" aria-label="المنصة">
          {podium.map((row) => {
            const first = row.rank === 1;
            return (
              <div
                key={row.userId}
                className="flex flex-col items-center gap-1"
                style={{ width: first ? 96 : 84 }}
              >
                <div
                  className="rounded-full flex items-center justify-center overflow-hidden"
                  style={{
                    width: first ? 60 : 50,
                    height: first ? 60 : 50,
                    border: first ? "3px solid var(--copper-500)" : "3px solid var(--mint-200)",
                    background: first
                      ? "linear-gradient(135deg, #f7e9de, #f1dcc9)"
                      : "var(--mint-100)",
                  }}
                >
                  <PlayerAvatar
                    photoUrl={row.photoUrl}
                    fullName={row.name}
                    size={first ? 54 : 44}
                  />
                </div>
                <p
                  className="text-[11px] font-extrabold text-center line-clamp-2 w-full"
                  style={{ color: "var(--text-main)", overflowWrap: "anywhere" }}
                >
                  {row.name}
                </p>
                <span
                  className="rounded-full inline-flex items-center justify-center text-[11px] font-black"
                  style={
                    first
                      ? {
                          padding: "3px 10px",
                          background:
                            "linear-gradient(135deg, var(--copper-500), var(--copper-600))",
                          color: "white",
                        }
                      : {
                          padding: "3px 10px",
                          background: "var(--mint-50)",
                          color: "var(--text-muted)",
                        }
                  }
                >
                  <span className="badge-numeral">
                    <NumericRanges>{String(row.total)}</NumericRanges>
                  </span>
                </span>
                <div
                  className="w-full rounded-t-xl flex items-center justify-center font-black"
                  style={{
                    height: first ? 46 : row.rank === 2 ? 32 : 24,
                    background: first
                      ? "linear-gradient(180deg, #f1dcc9, #f7e9de)"
                      : row.rank === 2
                        ? "var(--mint-100)"
                        : "var(--mint-50)",
                    color: first ? "var(--copper-600)" : "var(--mint-500)",
                    fontSize: first ? 18 : 13,
                  }}
                >
                  <span className="badge-numeral">
                    <NumericRanges>{String(row.rank)}</NumericRanges>
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {rows.length === 0 ? (
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          {empty}
        </p>
      ) : (
        <ol className="space-y-1.5">
          {rest.map((row) => (
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
              <PlayerAvatar photoUrl={row.photoUrl} fullName={row.name} size={26} />
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
