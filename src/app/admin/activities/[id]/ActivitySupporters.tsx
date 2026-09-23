"use client";

import { useEffect, useState } from "react";
import Icon from "@/components/Icon";
import Money from "@/components/Money";
import SupportersTable from "@/components/SupportersTable";
import type { PublicLeaderboardEntry } from "@/lib/donationsServer";
import { activityPage as texts } from "@/lib/texts";

export interface ActivityBoard {
  rows: PublicLeaderboardEntry[];
  total: number;
  given: number;
}

export default function ActivitySupporters({ activityId }: { activityId: string }) {
  const [board, setBoard] = useState<ActivityBoard | null>(null);

  useEffect(() => {
    fetch(`/api/admin/activities/${activityId}/supporters`)
      .then((r) => (r.ok ? r.json() : null))
      .then(setBoard)
      .catch(() => setBoard(null));
  }, [activityId]);

  if (!board) return null;

  return (
    <section className="space-y-3 pt-1" aria-labelledby="activity-supporters">
      <div className="flex items-center justify-between gap-3">
        <h2
          id="activity-supporters"
          className="flex items-center gap-1.5 text-base font-extrabold"
          style={{ color: "var(--text-main)" }}
        >
          <Icon name="heart" filled size={16} color="var(--mint-600)" />
          {texts.supportersHeading}
        </h2>
        {board.total > 0 && (
          <span className="text-sm font-black shrink-0" style={{ color: "var(--mint-700)" }}>
            <Money value={board.given} />
          </span>
        )}
      </div>

      {board.total === 0 ? (
        <p className="card p-5 text-sm text-center" style={{ color: "var(--text-muted)" }}>
          {texts.supportersEmpty}
        </p>
      ) : (
        <SupportersTable
          initial={board.rows}
          total={board.total}
          minePositions={[]}
          source={`/api/admin/activities/${activityId}/supporters`}
        />
      )}
    </section>
  );
}
