import type { ReactNode } from "react";
import PlayerAvatar from "./PlayerAvatar";
import PagedList from "./PagedList";

export type RankedRow = {
  id: string;
  name: string;
  photo?: string | null;
  sub?: string | null;
  value: ReactNode;
  avatar?: boolean;
  badge?: string;
};

export default function RankedList({ rows, pageSize }: { rows: RankedRow[]; pageSize?: number }) {
  return (
    <PagedList pageSize={pageSize}>
      {rows.map((row, i) => (
        <div key={row.id} className="card p-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <span
              className="rank-numeral"
              style={{ color: i === 0 ? "var(--copper-700)" : "var(--text-muted)" }}
            >
              {i + 1}
            </span>
            {row.avatar !== false && (
              <PlayerAvatar photo={row.photo} fullName={row.name} size={32} />
            )}
            <div className="min-w-0">
              <p
                className="font-bold text-sm truncate flex items-center gap-1.5"
                style={{ color: "var(--text-main)" }}
              >
                {row.name}
                {row.badge && (
                  <span className="badge badge-rejected shrink-0" style={{ fontSize: "10px" }}>
                    {row.badge}
                  </span>
                )}
              </p>
              {row.sub && (
                <p className="text-xs truncate" style={{ color: "var(--text-muted)" }}>
                  {row.sub}
                </p>
              )}
            </div>
          </div>
          <span
            className="font-black shrink-0 whitespace-nowrap"
            style={{ color: "var(--mint-700)" }}
          >
            {row.value}
          </span>
        </div>
      ))}
    </PagedList>
  );
}
